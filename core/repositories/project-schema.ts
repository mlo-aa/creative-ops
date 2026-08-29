/**
 * `projects` columns per supabase/migrations/001_initial_schema.sql
 * Source of truth for allowlist validation — keep in sync with that file.
 */
export const PROJECTS_TABLE_COLUMNS = [
  "id",
  "code",
  "name",
  "client_name",
  "description",
  "status",
  "project_color",
  "start_date",
  "deadline",
  "types",
  "intake_step",
  "intake_done",
  "format_id",
  "export_prefix",
  "brand",
  "graphics",
  "is_seed",
  "created_at",
  "updated_at",
] as const;

export type ProjectsTableColumn = (typeof PROJECTS_TABLE_COLUMNS)[number];

/**
 * Columns written by `projectToDbRow()` on upsert.
 * Excludes app-only / extension-stored fields (brand, graphics, format_id, export_prefix)
 * and created_at (DB default on insert).
 */
export const PROJECTS_UPSERT_ALLOWLIST = [
  "id",
  "code",
  "name",
  "client_name",
  "description",
  "status",
  "project_color",
  "start_date",
  "deadline",
  "types",
  "intake_step",
  "intake_done",
  "is_seed",
  "updated_at",
] as const;

export type ProjectsUpsertColumn = (typeof PROJECTS_UPSERT_ALLOWLIST)[number];

/** App fields persisted via brand_extensions / project_intake — never on projects row. */
export const PROJECTS_EXTENSION_FIELDS = [
  "brand",
  "graphics",
  "format_id",
  "export_prefix",
  "formatId",
  "exportPrefix",
] as const;

export function assertProjectRowKeys(row: Record<string, unknown>, operation = "projects.upsert"): void {
  const allowed = new Set<string>(PROJECTS_UPSERT_ALLOWLIST);
  const unexpected = Object.keys(row).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    throw new Error(
      `${operation}: unexpected column(s) [${unexpected.join(", ")}]. ` +
        `Allowed: [${PROJECTS_UPSERT_ALLOWLIST.join(", ")}]`,
    );
  }
}

export function pickProjectUpsertColumns(
  row: Record<ProjectsUpsertColumn, unknown>,
): Record<ProjectsUpsertColumn, unknown> {
  const picked = {} as Record<ProjectsUpsertColumn, unknown>;
  for (const key of PROJECTS_UPSERT_ALLOWLIST) {
    picked[key] = row[key];
  }
  return picked;
}
