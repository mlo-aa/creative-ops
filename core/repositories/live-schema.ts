/**
 * Live Supabase table schema introspection via PostgREST OpenAPI.
 * All cloud upserts filter candidate rows against actual live columns.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LiveSchemaMismatchError } from "@/core/repositories/supabase-errors";

const CACHE_TTL_MS = 60_000;

let schemaCache: { tables: Record<string, string[]>; fetchedAt: number } | null = null;

/** Tables written during syncCloudPersist / migration import. */
export const SYNC_TABLES = [
  "projects",
  "assets",
  "designs",
  "design_versions",
  "design_templates",
  "campaigns",
  "content_items",
  "project_sources",
  "project_references",
  "reference_boards",
  "project_intake",
  "project_strategy",
  "knowledge_notes",
  "project_decisions",
  "feeds",
  "feed_items",
  "clients",
  "proposals",
  "deliverables",
  "phases",
  "project_links",
  "inspirations",
  "ideas",
  "idea_nodes",
  "idea_edges",
  "calendar_events",
  "activities",
  "competitors",
  "workspace_meta",
  "brand_extensions",
] as const;

export type SyncTableName = (typeof SYNC_TABLES)[number];

/** Required identifiers/FKs — must exist on live table AND mapped row after filter. */
export const TABLE_REQUIRED_KEYS: Record<string, readonly string[]> = {
  projects: ["id"],
  assets: ["id", "project_id"],
  designs: ["id", "project_id"],
  design_versions: ["design_id"],
  design_templates: ["id"],
  campaigns: ["id", "project_id"],
  content_items: ["id", "project_id"],
  project_sources: ["id", "project_id"],
  project_references: ["id", "project_id"],
  reference_boards: ["id", "project_id"],
  project_intake: ["project_id"],
  project_strategy: ["project_id"],
  knowledge_notes: ["project_id"],
  brand_extensions: ["project_id"],
  project_decisions: ["id", "project_id"],
  feeds: ["id", "project_id"],
  feed_items: ["feed_id", "design_id"],
  clients: ["id"],
  proposals: ["id"],
  deliverables: ["id", "project_id"],
  phases: ["id", "project_id"],
  project_links: ["id", "project_id"],
  inspirations: ["id"],
  ideas: ["id", "project_id"],
  idea_nodes: ["id"],
  idea_edges: ["id"],
  calendar_events: ["id"],
  activities: ["id"],
  competitors: ["id", "project_id"],
  workspace_meta: ["key"],
};

export type UpsertFilterDiagnostics = {
  table: string;
  operation: string;
  liveColumns: string[];
  attemptedKeys: string[];
  filteredKeys: string[];
  omittedKeys: string[];
};

let lastFilterDiagnostics: UpsertFilterDiagnostics | null = null;

export function getLastUpsertFilterDiagnostics(): UpsertFilterDiagnostics | null {
  return lastFilterDiagnostics;
}

export function clearLiveSchemaCache(): void {
  schemaCache = null;
  lastFilterDiagnostics = null;
}

async function fetchOpenApiSchemas(): Promise<Record<string, string[]>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL or service role key not configured");
  }

  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
  });

  if (!res.ok) {
    throw new Error(`OpenAPI introspection failed (${res.status})`);
  }

  const spec = (await res.json()) as {
    definitions?: Record<string, { properties?: Record<string, unknown> }>;
    components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
  };

  const schemas = spec.definitions ?? spec.components?.schemas ?? {};
  const tables: Record<string, string[]> = {};

  for (const [name, schema] of Object.entries(schemas)) {
    if (schema?.properties && typeof schema.properties === "object") {
      tables[name] = Object.keys(schema.properties).sort();
    }
  }

  return tables;
}

async function loadSchemaCache(): Promise<Record<string, string[]>> {
  if (schemaCache && Date.now() - schemaCache.fetchedAt < CACHE_TTL_MS) {
    return schemaCache.tables;
  }

  const tables = await fetchOpenApiSchemas();
  schemaCache = { tables, fetchedAt: Date.now() };
  return tables;
}

/** Warm OpenAPI schema cache once per sync/import. */
export async function preloadLiveSchemas(_client?: SupabaseClient): Promise<void> {
  await loadSchemaCache();
}

export async function getLiveTableColumns(tableName: string): Promise<string[]> {
  const tables = await loadSchemaCache();
  const columns = tables[tableName];
  if (!columns?.length) {
    throw new LiveSchemaMismatchError(
      tableName,
      `Table '${tableName}' not found in PostgREST OpenAPI schema`,
    );
  }
  return columns;
}

export type FilterRowResult = {
  row: Record<string, unknown>;
  liveColumns: string[];
  attemptedKeys: string[];
  filteredKeys: string[];
  omittedKeys: string[];
};

function mergeOverflowIntoColumn(
  row: Record<string, unknown>,
  column: "metadata" | "data",
  overflow: Record<string, unknown>,
): void {
  if (!Object.keys(overflow).length) return;
  const existing =
    row[column] && typeof row[column] === "object" && !Array.isArray(row[column])
      ? (row[column] as Record<string, unknown>)
      : {};
  row[column] = { ...existing, ...overflow };
}

export function filterRowForLiveTableSync(
  tableName: string,
  candidate: Record<string, unknown>,
  liveColumns: readonly string[],
  requiredKeys: readonly string[] = TABLE_REQUIRED_KEYS[tableName] ?? [],
): FilterRowResult {
  const live = new Set(liveColumns);
  const attemptedKeys = Object.keys(candidate).sort();
  const row: Record<string, unknown> = {};
  const omitted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(candidate)) {
    if (live.has(key)) {
      row[key] = value;
    } else if (value !== undefined) {
      omitted[key] = value;
    }
  }

  const omittedKeys = Object.keys(omitted).sort();

  if (live.has("metadata")) {
    mergeOverflowIntoColumn(row, "metadata", omitted);
  } else if (live.has("data")) {
    mergeOverflowIntoColumn(row, "data", omitted);
  }

  for (const req of requiredKeys) {
    if (!live.has(req)) {
      throw new LiveSchemaMismatchError(
        tableName,
        `Required column '${req}' is missing from live table '${tableName}'`,
      );
    }
    const val = row[req];
    if (val === undefined || val === null || val === "") {
      throw new LiveSchemaMismatchError(
        tableName,
        `Required column '${req}' is missing or empty in mapped row for '${tableName}'`,
      );
    }
  }

  return {
    row,
    liveColumns: [...liveColumns],
    attemptedKeys,
    filteredKeys: Object.keys(row).sort(),
    omittedKeys,
  };
}

export async function filterRowForLiveTable(
  tableName: string,
  candidate: Record<string, unknown>,
  options?: { requiredKeys?: readonly string[] },
): Promise<FilterRowResult> {
  const liveColumns = await getLiveTableColumns(tableName);
  const requiredKeys = options?.requiredKeys ?? TABLE_REQUIRED_KEYS[tableName] ?? [];
  return filterRowForLiveTableSync(tableName, candidate, liveColumns, requiredKeys);
}

export async function filterRowsForLiveTable(
  tableName: string,
  candidates: Record<string, unknown>[],
  options?: { requiredKeys?: readonly string[] },
): Promise<FilterRowResult[]> {
  const liveColumns = await getLiveTableColumns(tableName);
  const requiredKeys = options?.requiredKeys ?? TABLE_REQUIRED_KEYS[tableName] ?? [];
  return candidates.map((c) => filterRowForLiveTableSync(tableName, c, liveColumns, requiredKeys));
}

export function recordFilterDiagnostics(
  table: string,
  operation: string,
  result: FilterRowResult,
): void {
  lastFilterDiagnostics = {
    table,
    operation,
    liveColumns: result.liveColumns,
    attemptedKeys: result.attemptedKeys,
    filteredKeys: result.filteredKeys,
    omittedKeys: result.omittedKeys,
  };
}

/** @deprecated Use getLiveTableColumns("projects") */
export async function getLiveProjectColumns(client?: SupabaseClient): Promise<string[]> {
  return getLiveTableColumns("projects");
}

export type LiveSchemaInfo = {
  liveProjectColumns: string[];
  introspectionSource: "openapi" | "fallback";
};

export async function getLiveSchemaInfo(_client?: SupabaseClient): Promise<LiveSchemaInfo> {
  try {
    await preloadLiveSchemas();
    return {
      liveProjectColumns: await getLiveTableColumns("projects"),
      introspectionSource: "openapi",
    };
  } catch {
    return { liveProjectColumns: [], introspectionSource: "fallback" };
  }
}

/** Backward compat */
export function partitionProjectRowForLiveSchema(
  candidate: Record<string, unknown>,
  liveColumns: readonly string[],
): { row: Record<string, unknown>; overflow: Record<string, unknown> } {
  const result = filterRowForLiveTableSync("projects", candidate, liveColumns, ["id"]);
  const overflow: Record<string, unknown> = {};
  for (const key of result.omittedKeys) {
    overflow[key] = candidate[key];
  }
  return { row: result.row, overflow };
}

export function filterRowToLiveColumns(
  row: Record<string, unknown>,
  liveColumns: readonly string[],
): Record<string, unknown> {
  return filterRowForLiveTableSync("_", row, liveColumns, []).row;
}
