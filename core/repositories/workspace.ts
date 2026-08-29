import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpsPersist } from "@/core/ops/types";
import type { AppPersist, ProjectConfig, ProjectOverlay, StudioPost } from "@/core/types";
import { SEED_PROJECTS } from "@/projects";
import { emptyOpsPersist } from "@/core/ops/types";
import { ensureOpsMigration } from "@/core/ops/migrate";
import { buildEffectiveProjects, mergeProject } from "@/core/repository/hydrate";
import { assertNoError, CloudSyncError } from "@/core/repositories/supabase-errors";
import type { ImportStats } from "@/core/repositories/import-stats";
import {
  activityToDbRow,
  assetToDbRow,
  buildProjectRowCandidate,
  calendarEventToDbRow,
  campaignToDbRow,
  clientToDbRow,
  competitorToDbRow,
  contentItemToDbRow,
  decisionToDbRow,
  deliverableToDbRow,
  designTemplateToDbRow,
  designToDbRow,
  feedToDbRow,
  ideaEdgeToDbRow,
  ideaNodeToDbRow,
  ideaToDbRow,
  inspirationToDbRow,
  jsonbProjectRow,
  orphanBrandExtensionRow,
  phaseToDbRow,
  projectBrandExtensionRow,
  projectIntakeOverflowRow,
  projectLinkToDbRow,
  proposalToDbRow,
  referenceBoardToDbRow,
  referenceToDbRow,
  sourceToDbRow,
  workspaceMetaRow,
} from "@/core/repositories/db-mappers";
import {
  filterRowsForLiveTable,
  getLastUpsertFilterDiagnostics,
  getLiveTableColumns,
  partitionProjectRowForLiveSchema,
  preloadLiveSchemas,
  recordFilterDiagnostics,
  type UpsertFilterDiagnostics,
} from "@/core/repositories/live-schema";

const MIGRATION_KEY = "local_migration_completed";

export { MIGRATION_KEY as MIGRATION_MARKER_KEY };
export { getLastUpsertFilterDiagnostics, type UpsertFilterDiagnostics };

/** @deprecated Use getLastUpsertFilterDiagnostics */
export function getLastProjectSyncDiagnostics(): {
  liveProjectColumns: string[];
  projectUpsertKeys: string[];
} {
  const d = getLastUpsertFilterDiagnostics();
  return {
    liveProjectColumns: d?.liveColumns ?? [],
    projectUpsertKeys: d?.filteredKeys ?? [],
  };
}

export type WorkspaceMeta = {
  projectCodeCounter: number;
  localMigrationCompleted: boolean;
};

export async function loadWorkspaceMeta(client: SupabaseClient): Promise<WorkspaceMeta> {
  const { data } = await client.from("workspace_meta").select("key, value").in("key", [
    "project_code_counter",
    MIGRATION_KEY,
  ]);
  const rows = data ?? [];
  const counter = rows.find((r) => r.key === "project_code_counter");
  const migration = rows.find((r) => r.key === MIGRATION_KEY);
  return {
    projectCodeCounter: (counter?.value as { count?: number })?.count ?? 5,
    localMigrationCompleted: Boolean((migration?.value as { done?: boolean })?.done),
  };
}

export async function setMigrationCompleted(client: SupabaseClient): Promise<void> {
  const { error } = await client.from("workspace_meta").upsert({
    key: MIGRATION_KEY,
    value: { done: true, at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
  assertNoError("workspace_meta.setMigrationCompleted", error);
}

/** Removes the migration-completed marker only — does not delete workspace data. */
export async function clearMigrationCompleted(client: SupabaseClient): Promise<void> {
  const { error } = await client.from("workspace_meta").delete().eq("key", MIGRATION_KEY);
  assertNoError("workspace_meta.clearMigrationCompleted", error);
}

async function upsertLiveRows(
  client: SupabaseClient,
  table: string,
  candidates: Record<string, unknown>[],
  operation: string,
): Promise<void> {
  if (!candidates.length) return;
  const filtered = await filterRowsForLiveTable(table, candidates);
  if (filtered.length) recordFilterDiagnostics(table, operation, filtered[0]);
  const rows = filtered.map((f) => f.row);
  const { error } = await client.from(table).upsert(rows);
  assertNoError(operation, error, getLastUpsertFilterDiagnostics() ?? undefined);
}

async function insertLiveRows(
  client: SupabaseClient,
  table: string,
  candidates: Record<string, unknown>[],
  operation: string,
): Promise<void> {
  if (!candidates.length) return;
  const filtered = await filterRowsForLiveTable(table, candidates);
  if (filtered.length) recordFilterDiagnostics(table, operation, filtered[0]);
  const rows = filtered.map((f) => f.row);
  const { error } = await client.from(table).insert(rows);
  assertNoError(operation, error, getLastUpsertFilterDiagnostics() ?? undefined);
}

/** Verify cloud contains expected records after import/sync. */
export async function verifyCloudImport(
  client: SupabaseClient,
  expected: ImportStats,
): Promise<{ projectCount: number; designCount: number }> {
  if (expected.projectCount > 0) {
    const { data, error } = await client.from("projects").select("id").in("id", expected.projectIds);
    assertNoError("verify.projects.select", error);
    const found = data?.length ?? 0;
    if (found < expected.projectIds.length) {
      throw new CloudSyncError(
        "verify.projects",
        new Error(
          `Verification failed: expected ${expected.projectIds.length} projects in cloud, found ${found}`,
        ),
      );
    }
  }

  const { count, error: designErr } = await client
    .from("designs")
    .select("*", { count: "exact", head: true });
  assertNoError("verify.designs.count", designErr);
  const designCount = count ?? 0;
  if (expected.designCount > 0 && designCount < expected.designCount) {
    throw new CloudSyncError(
      "verify.designs",
      new Error(
        `Verification failed: expected at least ${expected.designCount} designs in cloud, found ${designCount}`,
      ),
    );
  }

  const cloudCounts = await getCloudRecordCounts(client);
  return { projectCount: cloudCounts.projectCount, designCount: cloudCounts.designCount };
}

export async function getCloudRecordCounts(client: SupabaseClient): Promise<{
  projectCount: number;
  designCount: number;
  templateCount: number;
  campaignCount: number;
}> {
  const [projectsRes, designsRes, templatesRes, campaignsRes] = await Promise.all([
    client.from("projects").select("*", { count: "exact", head: true }),
    client.from("designs").select("*", { count: "exact", head: true }),
    client.from("design_templates").select("*", { count: "exact", head: true }),
    client.from("campaigns").select("*", { count: "exact", head: true }),
  ]);
  assertNoError("cloudCounts.projects", projectsRes.error);
  assertNoError("cloudCounts.designs", designsRes.error);
  assertNoError("cloudCounts.templates", templatesRes.error);
  assertNoError("cloudCounts.campaigns", campaignsRes.error);
  return {
    projectCount: projectsRes.count ?? 0,
    designCount: designsRes.count ?? 0,
    templateCount: templatesRes.count ?? 0,
    campaignCount: campaignsRes.count ?? 0,
  };
}

export async function loadCloudPersist(client: SupabaseClient): Promise<AppPersist | null> {
  try {
    const [
      projectsRes,
      designsRes,
      feedsRes,
      feedItemsRes,
      assetsRes,
      templatesRes,
      sourcesRes,
      refsRes,
      boardsRes,
      decisionsRes,
      campaignsRes,
      contentRes,
      intakeRes,
      strategyRes,
      knowledgeRes,
      brandExtRes,
      clientsRes,
      proposalsRes,
      deliverablesRes,
      phasesRes,
      linksRes,
      inspirationsRes,
      ideasRes,
      nodesRes,
      edgesRes,
      eventsRes,
      activitiesRes,
      competitorsRes,
      meta,
    ] = await Promise.all([
      client.from("projects").select("*"),
      client.from("designs").select("*"),
      client.from("feeds").select("*"),
      client.from("feed_items").select("*"),
      client.from("assets").select("*"),
      client.from("design_templates").select("*"),
      client.from("project_sources").select("*"),
      client.from("project_references").select("*"),
      client.from("reference_boards").select("*"),
      client.from("project_decisions").select("*"),
      client.from("campaigns").select("*"),
      client.from("content_items").select("*"),
      client.from("project_intake").select("*"),
      client.from("project_strategy").select("*"),
      client.from("knowledge_notes").select("*"),
      client.from("brand_extensions").select("*"),
      client.from("clients").select("*"),
      client.from("proposals").select("*"),
      client.from("deliverables").select("*"),
      client.from("phases").select("*"),
      client.from("project_links").select("*"),
      client.from("inspirations").select("*"),
      client.from("ideas").select("*"),
      client.from("idea_nodes").select("*"),
      client.from("idea_edges").select("*"),
      client.from("calendar_events").select("*"),
      client.from("activities").select("*"),
      client.from("competitors").select("*"),
      loadWorkspaceMeta(client),
    ]);

    const projects = projectsRes.data ?? [];
    if (projects.length === 0 && (designsRes.data ?? []).length === 0) {
      return null;
    }

    const designs = designsRes.data ?? [];
    const feedItems = feedItemsRes.data ?? [];
    const feeds = feedsRes.data ?? [];
    const assets = assetsRes.data ?? [];

    const userProjects: ProjectConfig[] = [];
    const overlays: Record<string, ProjectOverlay> = {};
    const ops: OpsPersist = { ...emptyOpsPersist(), projectCodeCounter: meta.projectCodeCounter };

    for (const row of projects) {
      if (row.is_seed) continue;

      const projectDesigns = designs.filter((d) => d.project_id === row.id);
      const projectAssets = assets.filter((a) => a.project_id === row.id);
      const feed = feeds.find((f) => f.project_id === row.id);
      const items = feed ? feedItems.filter((fi) => fi.feed_id === feed.id).sort((a, b) => a.position - b.position) : [];

      userProjects.push({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        formatId: row.format_id,
        exportPrefix: row.export_prefix,
        brand: row.brand as ProjectConfig["brand"],
        assets: projectAssets.map((a) => ({
          id: a.id,
          name: a.name,
          src: a.public_url,
          category: a.category as ProjectConfig["assets"][0]["category"],
          tags: (a.tags as string[]) ?? [],
        })),
        posts: projectDesigns.map(designRowToPost),
        graphics: row.graphics as ProjectConfig["graphics"],
      });

      if (feed && items.length) {
        overlays[row.id] = {
          posts: {
            order: items.map((i) => i.design_id),
            extras: [],
            patches: Object.fromEntries(
              items.map((i) => [
                i.design_id,
                { status: i.active ? ("active" as const) : ("draft" as const) },
              ]),
            ),
            deletedIds: [],
            viewMode: feed.view_mode as "feed" | "board",
          },
        };
      }
    }

    // Seed project cloud overrides
    for (const seed of SEED_PROJECTS) {
      const seedDesigns = designs.filter((d) => d.project_id === seed.id);
      if (!seedDesigns.length) continue;

      const feed = feeds.find((f) => f.project_id === seed.id);
      const items = feed ? feedItems.filter((fi) => fi.feed_id === feed.id).sort((a, b) => a.position - b.position) : [];
      const seedIds = new Set(seed.posts.map((p) => p.id));

      const extras: StudioPost[] = [];
      const patches: Record<string, import("@/core/types").PostPatch> = {};
      const deletedIds: string[] = [];

      for (const d of seedDesigns) {
        const post = designRowToPost(d);
        if (seedIds.has(d.id)) {
          patches[d.id] = {
            title: post.title,
            design: post.design,
            document: post.document,
            status: post.status,
            referencePostIds: post.referencePostIds,
          };
        } else {
          extras.push(post);
        }
      }

      const cloudProject = projects.find((p) => p.id === seed.id);
      overlays[seed.id] = {
        ...(cloudProject
          ? {
              brand: cloudProject.brand as ProjectOverlay["brand"],
              formatId: cloudProject.format_id,
              exportPrefix: cloudProject.export_prefix,
            }
          : {}),
        assets: assets
          .filter((a) => a.project_id === seed.id)
          .map((a) => ({
            id: a.id,
            name: a.name,
            src: a.public_url,
            category: a.category as ProjectConfig["assets"][0]["category"],
            tags: (a.tags as string[]) ?? [],
          })),
        posts: {
          order: items.length ? items.map((i) => i.design_id as string) : seed.posts.map((sp) => sp.id),
          extras,
          patches,
          deletedIds,
          viewMode: feed?.view_mode as "feed" | "board" | undefined,
        },
      };
    }

    // Ops entities
    ops.projects = projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      clientName: p.client_name,
      type: ((p.types as string[])?.[0] ?? "other") as OpsPersist["projects"][0]["type"],
      types: (p.types as OpsPersist["projects"][0]["types"]) ?? ["other"],
      status: p.status as OpsPersist["projects"][0]["status"],
      color: p.project_color,
      startDate: p.start_date ?? undefined,
      deadline: p.deadline ?? undefined,
      description: p.description,
      intakeStep: p.intake_step ?? undefined,
      intakeCompleted: p.intake_done ?? undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    for (const row of intakeRes.data ?? []) {
      ops.intake[row.project_id] = row.data as OpsPersist["intake"][string];
    }
    for (const row of strategyRes.data ?? []) {
      ops.strategies[row.project_id] = row.data as OpsPersist["strategies"][string];
    }
    for (const row of knowledgeRes.data ?? []) {
      ops.knowledge[row.project_id] = row.data as OpsPersist["knowledge"][string];
    }
    for (const row of brandExtRes.data ?? []) {
      ops.brandExtensions[row.project_id] = row.data as OpsPersist["brandExtensions"][string];
    }

    ops.sources = (sourcesRes.data ?? []).map((s) => ({
      id: s.id,
      projectId: s.project_id,
      title: s.title,
      sourceType: s.source_type as OpsPersist["sources"][0]["sourceType"],
      category: s.category as OpsPersist["sources"][0]["category"],
      url: s.url,
      description: s.description,
      priority: s.priority as OpsPersist["sources"][0]["priority"],
      status: s.status as OpsPersist["sources"][0]["status"],
      isSourceOfTruth: s.is_source_of_truth,
      fileData: "",
      fileName: (s.metadata as { fileName?: string })?.fileName ?? "",
      fileMime: (s.metadata as { fileMime?: string })?.fileMime ?? "",
      content: (s.metadata as { content?: string })?.content ?? "",
      tags: (s.metadata as { tags?: string[] })?.tags ?? [],
      notes: (s.metadata as { notes?: string })?.notes ?? "",
      relatedDecisionIds: (s.metadata as { relatedDecisionIds?: string[] })?.relatedDecisionIds ?? [],
      relatedContentIds: (s.metadata as { relatedContentIds?: string[] })?.relatedContentIds ?? [],
      relatedDeliverableIds: (s.metadata as { relatedDeliverableIds?: string[] })?.relatedDeliverableIds ?? [],
      supersededBy: (s.metadata as { supersededBy?: string })?.supersededBy ?? "",
      extractedText: (s.metadata as { extractedText?: string })?.extractedText ?? "",
      dateAdded: s.created_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      ...(s.storage_path ? { storagePath: s.storage_path, publicUrl: (s.metadata as { publicUrl?: string })?.publicUrl } : {}),
    })) as OpsPersist["sources"];

    ops.references = (refsRes.data ?? []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      boardId: r.board_id ?? "",
      title: r.title,
      url: r.url,
      notes: r.notes,
      whatWeLike: r.likes,
      whatNotToCopy: r.avoid,
      category: r.category,
      imageSrc: (r.metadata as { imageSrc?: string })?.imageSrc ?? "",
      tags: (r.metadata as { tags?: string[] })?.tags ?? [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })) as OpsPersist["references"];

    ops.referenceBoards = (boardsRes.data ?? []).map((b) => ({
      id: b.id,
      projectId: b.project_id,
      name: b.name,
      description: b.description,
      createdAt: b.created_at,
    })) as OpsPersist["referenceBoards"];

    ops.decisions = (decisionsRes.data ?? []).map((d) => ({
      id: d.id,
      projectId: d.project_id,
      decision: d.decision,
      rationale: d.rationale,
      area: d.area,
      status: d.status as OpsPersist["decisions"][0]["status"],
      date: (d.metadata as { date?: string })?.date ?? "",
      sourceId: (d.metadata as { sourceId?: string })?.sourceId ?? "",
      person: (d.metadata as { person?: string })?.person ?? "",
      supersededBy: d.supersedes_id ?? "",
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })) as OpsPersist["decisions"];

    ops.campaigns = (campaignsRes.data ?? []).map((c) => ({
      id: c.id,
      projectId: c.project_id,
      name: c.name,
      objective: c.objective,
      startDate: c.start_date ?? undefined,
      endDate: c.end_date ?? undefined,
      status: c.status as OpsPersist["campaigns"][0]["status"],
      kpis: (c.metadata as { kpis?: string })?.kpis ?? "",
      createdAt: c.created_at,
    })) as OpsPersist["campaigns"];

    ops.contentItems = (contentRes.data ?? []).map((c) => ({
      id: c.id,
      projectId: c.project_id,
      campaignId: c.campaign_id ?? undefined,
      title: c.title,
      platform: c.platform as OpsPersist["contentItems"][0]["platform"],
      format: c.format as OpsPersist["contentItems"][0]["format"],
      publicationDate: c.publication_date ?? undefined,
      status: c.status as OpsPersist["contentItems"][0]["status"],
      caption: c.caption,
      hashtags: c.hashtags,
      relatedPostId: c.design_id ?? undefined,
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })) as OpsPersist["contentItems"];

    ops.clients = (clientsRes.data ?? []).map((c) => c.data as OpsPersist["clients"][0]);
    ops.proposals = (proposalsRes.data ?? []).map((p) => p.data as OpsPersist["proposals"][0]);
    ops.deliverables = (deliverablesRes.data ?? []).map((d) => d.data as OpsPersist["deliverables"][0]);
    ops.phases = (phasesRes.data ?? []).map((p) => p.data as OpsPersist["phases"][0]);
    ops.links = (linksRes.data ?? []).map((l) => l.data as OpsPersist["links"][0]);
    ops.inspirations = (inspirationsRes.data ?? []).map((i) => i.data as OpsPersist["inspirations"][0]);
    ops.ideas = (ideasRes.data ?? []).map((i) => i.data as OpsPersist["ideas"][0]);
    ops.ideaNodes = (nodesRes.data ?? []).map((n) => n.data as OpsPersist["ideaNodes"][0]);
    ops.ideaEdges = (edgesRes.data ?? []).map((e) => e.data as OpsPersist["ideaEdges"][0]);
    ops.calendarEvents = (eventsRes.data ?? []).map((e) => e.data as OpsPersist["calendarEvents"][0]);
    ops.activities = (activitiesRes.data ?? []).map((a) => a.data as OpsPersist["activities"][0]);
    ops.competitors = (competitorsRes.data ?? []).map((c) => c.data as OpsPersist["competitors"][0]);

    ops.designTemplates = (templatesRes.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      projectId: t.project_id ?? undefined,
      tags: (t.metadata as { tags?: string[] })?.tags ?? [],
      mode: ((t.metadata as { mode?: string })?.mode ?? "document") as "document" | "legacy",
      document: t.document as import("@/core/design/document").DesignDocument | undefined,
      legacyTemplate: (t.metadata as { legacyTemplate?: string })?.legacyTemplate,
      legacyDesign: (t.metadata as { legacyDesign?: object })?.legacyDesign,
      exportKind: (t.metadata as { exportKind?: string })?.exportKind as StudioPost["exportKind"],
      durationMs: (t.metadata as { durationMs?: number })?.durationMs,
      sourcePostId: (t.metadata as { sourcePostId?: string })?.sourcePostId,
      createdAt: t.created_at,
    })) as OpsPersist["designTemplates"];

    const persist: AppPersist = {
      version: 2,
      userProjects,
      overlays,
      ops: ensureOpsMigration(ops, [...SEED_PROJECTS, ...userProjects]),
    };

    return persist;
  } catch (err) {
    console.error("[cloud] load failed", err);
    return null;
  }
}

function designRowToPost(row: Record<string, unknown>): StudioPost {
  return {
    id: row.id as string,
    baseId: (row.base_id as string) || (row.id as string),
    number: row.number as string,
    title: row.title as string,
    exportKind: row.export_kind as StudioPost["exportKind"],
    durationMs: row.duration_ms as number,
    status: row.status as StudioPost["status"],
    kind: row.kind as StudioPost["kind"],
    variantOf: row.variant_of as string | undefined,
    variantLabel: row.variant_label as string | undefined,
    exportSlug: row.export_slug as string | undefined,
    template: row.template as string,
    design: row.design_state as StudioPost["design"],
    document: row.document as StudioPost["document"],
    referencePostIds: row.reference_post_ids as string[] | undefined,
    slides: row.slides as StudioPost["slides"],
  };
}

export async function syncCloudPersist(client: SupabaseClient, persist: AppPersist): Promise<void> {
  await preloadLiveSchemas(client);
  const allProjects = buildEffectiveProjects(persist);
  const liveProjectColumns = await getLiveTableColumns("projects");

  const mapped = allProjects.map((p) => {
    const opsProject = persist.ops.projects.find((o) => o.id === p.id);
    const isSeed = SEED_PROJECTS.some((s) => s.id === p.id);
    const candidate = buildProjectRowCandidate(p, opsProject, isSeed);
    const { overflow } = partitionProjectRowForLiveSchema(candidate, liveProjectColumns);
    return { project: p, candidate, overflow };
  });

  const projectCandidates = mapped.map((m) => m.candidate);
  if (projectCandidates.length) {
    await upsertLiveRows(client, "projects", projectCandidates, "projects.upsert");
  }

  const intakeByProject = new Map<string, { project_id: string; data: unknown; updated_at: string }>();
  for (const [projectId, data] of Object.entries(persist.ops.intake)) {
    intakeByProject.set(projectId, jsonbProjectRow(projectId, data));
  }
  for (const { project, overflow } of mapped) {
    const existing = persist.ops.intake[project.id] as Record<string, unknown> | undefined;
    const overflowRow = projectIntakeOverflowRow(project.id, existing, overflow);
    if (overflowRow) intakeByProject.set(project.id, overflowRow);
  }
  const intakeRows = [...intakeByProject.values()];
  if (intakeRows.length) await upsertLiveRows(client, "project_intake", intakeRows, "project_intake.upsert");

  const strategyRows = Object.entries(persist.ops.strategies).map(([projectId, data]) =>
    jsonbProjectRow(projectId, data),
  );
  if (strategyRows.length) await upsertLiveRows(client, "project_strategy", strategyRows, "project_strategy.upsert");

  const knowledgeRows = Object.entries(persist.ops.knowledge).map(([projectId, data]) =>
    jsonbProjectRow(projectId, data),
  );
  if (knowledgeRows.length) await upsertLiveRows(client, "knowledge_notes", knowledgeRows, "knowledge_notes.upsert");

  const brandExtRows = mapped.map(({ project, overflow }) =>
    projectBrandExtensionRow(
      project,
      persist.ops.brandExtensions[project.id] as Record<string, unknown> | undefined,
      overflow,
    ),
  );
  for (const [projectId, data] of Object.entries(persist.ops.brandExtensions)) {
    if (!allProjects.some((p) => p.id === projectId)) {
      brandExtRows.push(orphanBrandExtensionRow(projectId, data as Record<string, unknown>));
    }
  }
  if (brandExtRows.length) await upsertLiveRows(client, "brand_extensions", brandExtRows, "brand_extensions.upsert");

  const feedRows = allProjects.map((p) => {
    const overlay = persist.overlays[p.id];
    return feedToDbRow(p.id, `feed-${p.id}`, overlay?.posts?.viewMode ?? "feed");
  });
  if (feedRows.length) await upsertLiveRows(client, "feeds", feedRows, "feeds.upsert");

  const assetRows = allProjects.flatMap((p) => p.assets.map((a) => assetToDbRow(p.id, a)));
  if (assetRows.length) await upsertLiveRows(client, "assets", assetRows, "assets.upsert");

  if (persist.ops.sources.length) {
    await upsertLiveRows(
      client,
      "project_sources",
      persist.ops.sources.map(sourceToDbRow),
      "project_sources.upsert",
    );
  }

  if (persist.ops.references.length) {
    await upsertLiveRows(
      client,
      "project_references",
      persist.ops.references.map(referenceToDbRow),
      "project_references.upsert",
    );
  }

  if (persist.ops.referenceBoards.length) {
    await upsertLiveRows(
      client,
      "reference_boards",
      persist.ops.referenceBoards.map(referenceBoardToDbRow),
      "reference_boards.upsert",
    );
  }

  if (persist.ops.decisions.length) {
    await upsertLiveRows(
      client,
      "project_decisions",
      persist.ops.decisions.map(decisionToDbRow),
      "project_decisions.upsert",
    );
  }

  const designRows = allProjects.flatMap((p) => p.posts.map((post) => designToDbRow(p.id, post)));
  if (designRows.length) await upsertLiveRows(client, "designs", designRows, "designs.upsert");

  for (const p of allProjects) {
    const overlay = persist.overlays[p.id];
    const feedId = `feed-${p.id}`;
    const order = overlay?.posts?.order?.length
      ? overlay.posts.order
      : p.posts.map((post: StudioPost) => post.id);

    const feedItemRows = order
      .map((designId: string, position: number) => {
        const post = p.posts.find((item: StudioPost) => item.id === designId);
        if (!post) return null;
        return {
          feed_id: feedId,
          design_id: designId,
          position,
          active: post.status === "active",
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (feedItemRows.length) {
      const { error: delErr } = await client.from("feed_items").delete().eq("feed_id", feedId);
      assertNoError(`feed_items.delete(${feedId})`, delErr);
      await insertLiveRows(client, "feed_items", feedItemRows, `feed_items.insert(${feedId})`);
    }
  }

  if (persist.ops.campaigns.length) {
    await upsertLiveRows(
      client,
      "campaigns",
      persist.ops.campaigns.map(campaignToDbRow),
      "campaigns.upsert",
    );
  }

  if (persist.ops.contentItems.length) {
    await upsertLiveRows(
      client,
      "content_items",
      persist.ops.contentItems.map(contentItemToDbRow),
      "content_items.upsert",
    );
  }

  if (persist.ops.designTemplates.length) {
    await upsertLiveRows(
      client,
      "design_templates",
      persist.ops.designTemplates.map(designTemplateToDbRow),
      "design_templates.upsert",
    );
  }

  if (persist.ops.clients.length) {
    await upsertLiveRows(client, "clients", persist.ops.clients.map(clientToDbRow), "clients.upsert");
  }
  if (persist.ops.proposals.length) {
    await upsertLiveRows(client, "proposals", persist.ops.proposals.map(proposalToDbRow), "proposals.upsert");
  }
  if (persist.ops.deliverables.length) {
    await upsertLiveRows(
      client,
      "deliverables",
      persist.ops.deliverables.map(deliverableToDbRow),
      "deliverables.upsert",
    );
  }
  if (persist.ops.phases.length) {
    await upsertLiveRows(client, "phases", persist.ops.phases.map(phaseToDbRow), "phases.upsert");
  }
  if (persist.ops.links.length) {
    await upsertLiveRows(client, "project_links", persist.ops.links.map(projectLinkToDbRow), "project_links.upsert");
  }
  if (persist.ops.inspirations.length) {
    await upsertLiveRows(
      client,
      "inspirations",
      persist.ops.inspirations.map(inspirationToDbRow),
      "inspirations.upsert",
    );
  }
  if (persist.ops.ideas.length) {
    await upsertLiveRows(client, "ideas", persist.ops.ideas.map(ideaToDbRow), "ideas.upsert");
  }
  if (persist.ops.ideaNodes.length) {
    await upsertLiveRows(client, "idea_nodes", persist.ops.ideaNodes.map(ideaNodeToDbRow), "idea_nodes.upsert");
  }
  if (persist.ops.ideaEdges.length) {
    await upsertLiveRows(client, "idea_edges", persist.ops.ideaEdges.map(ideaEdgeToDbRow), "idea_edges.upsert");
  }
  if (persist.ops.calendarEvents.length) {
    await upsertLiveRows(
      client,
      "calendar_events",
      persist.ops.calendarEvents.map(calendarEventToDbRow),
      "calendar_events.upsert",
    );
  }
  if (persist.ops.activities.length) {
    await upsertLiveRows(client, "activities", persist.ops.activities.map(activityToDbRow), "activities.upsert");
  }
  if (persist.ops.competitors.length) {
    await upsertLiveRows(
      client,
      "competitors",
      persist.ops.competitors.map(competitorToDbRow),
      "competitors.upsert",
    );
  }

  await upsertLiveRows(
    client,
    "workspace_meta",
    [workspaceMetaRow("project_code_counter", { count: persist.ops.projectCodeCounter })],
    "workspace_meta.project_code_counter",
  );
}

export type ImportResult = {
  stats: ImportStats;
  verified: { projectCount: number; designCount: number };
};

/** Transactional import: write → verify → optionally mark complete. Caller must use service-role client. */
export async function importLocalToCloud(
  client: SupabaseClient,
  local: AppPersist,
  stats: ImportStats,
  options?: { setMigrationMarker?: boolean },
): Promise<ImportResult> {
  await syncCloudPersist(client, local);
  const verified = await verifyCloudImport(client, stats);
  if (options?.setMigrationMarker !== false) {
    await setMigrationCompleted(client);
  }
  return { stats, verified };
}
