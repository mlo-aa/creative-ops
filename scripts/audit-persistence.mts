/**
 * Persistence audit — run: npm run audit:persistence
 * Requires SUPABASE env vars for full cloud tests; skips cloud when unconfigured.
 */
import assert from "node:assert/strict";
import {
  blankCanvasDocument,
  cloneDocument,
  textElement,
  rectangleElement,
} from "../core/design/document";
import type { DesignDocument, DesignElement } from "../core/design/document";
import { mergeProject } from "../core/repository/hydrate";
import { SEED_PROJECTS } from "../projects/index";

const results: { name: string; ok: boolean; detail?: string }[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`✓ ${name}`);
    } catch (e) {
      results.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
      console.error(`✗ ${name}: ${results.at(-1)?.detail}`);
    }
  })();
}

function renderPrimitiveCoverage(doc: DesignDocument): Set<string> {
  const rendered = new Set<string>();
  for (const el of doc.elements) rendered.add(el.type);
  return rendered;
}

await test("DesignDocument includes schemaVersion", () => {
  const doc = blankCanvasDocument(SEED_PROJECTS[0].brand);
  assert.equal(doc.schemaVersion, 1);
});

await test("cloneDocument backfills schemaVersion", () => {
  const doc = { ...blankCanvasDocument(SEED_PROJECTS[0].brand), schemaVersion: undefined as unknown as 1 };
  const cloned = cloneDocument(doc);
  assert.equal(cloned.schemaVersion, 1);
});

await test("Primitive schema: svg, line, group elements constructable", () => {
  const brand = SEED_PROJECTS[0].brand;
  const doc = blankCanvasDocument(brand);
  const line: DesignElement = {
    id: "line-1",
    type: "line",
    name: "Line",
    visible: true,
    locked: false,
    x: 100,
    y: 200,
    width: 400,
    height: 4,
    rotation: 0,
    opacity: 1,
    zIndex: 5,
    props: { strokeColorId: brand.defaultText, strokeWidth: 2, x2: 500, y2: 200 },
  };
  const svg: DesignElement = {
    id: "svg-1",
    type: "svg",
    name: "SVG",
    visible: true,
    locked: false,
    x: 80,
    y: 80,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    zIndex: 6,
    props: {
      pathId: "test",
      pathData: "M10 10 L190 190",
      strokeColorId: brand.defaultAccent,
      strokeWidth: 3,
      fillColorId: "",
    },
  };
  const rect = rectangleElement({ id: "r1", zIndex: 1 }, brand);
  const group: DesignElement = {
    id: "group-1",
    type: "group",
    name: "Group",
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 1080,
    height: 1440,
    rotation: 0,
    opacity: 1,
    zIndex: 10,
    props: { childIds: ["r1"] },
  };
  doc.elements.push(line, svg, rect, group);
  const types = renderPrimitiveCoverage(doc);
  assert.ok(types.has("line"));
  assert.ok(types.has("svg"));
  assert.ok(types.has("group"));
});

await test("DocumentRenderer module exports (compile check)", async () => {
  const mod = await import("../core/design/render/DocumentRenderer");
  assert.equal(typeof mod.DocumentRenderer, "function");
});

await test("Repository modules load", async () => {
  await import("../core/repositories/projects");
  await import("../core/repositories/designs");
  await import("../core/repositories/assets");
  await import("../core/repositories/templates");
  await import("../core/repositories/content");
  await import("../core/repositories/sources");
  await import("../core/repository/cloud-sync");
  await import("../core/repository/cache");
});

await test("Cloud sync module: offline queue when unconfigured", async () => {
  const { cloudPersistenceEnabled, queueCloudSync } = await import("../core/repository/cloud-sync");
  if (cloudPersistenceEnabled()) {
    console.log("  (cloud configured — skipping unconfigured test)");
    return;
  }
  queueCloudSync({ version: 2, userProjects: [], overlays: {}, ops: { projects: [], clients: [], proposals: [], ideas: [], strategies: {}, links: [], phases: [], deliverables: [], contentItems: [], campaigns: [], brandExtensions: {}, inspirations: [], ideaNodes: [], ideaEdges: [], calendarEvents: [], activities: [], sources: [], references: [], referenceBoards: [], decisions: [], knowledge: {}, intake: {}, competitors: [], designTemplates: [], projectCodeCounter: 5 } });
});

await test("Seed + overlay merge unchanged for legacy posts", () => {
  const senda = SEED_PROJECTS.find((p) => p.id === "senda")!;
  const merged = mergeProject(senda, {});
  const post = merged.posts.find((p) => p.status === "active");
  assert.ok(post);
  assert.notEqual(post!.template, "document");
});

await test("Migration marker key defined in workspace module", async () => {
  const ws = await import("../core/repositories/workspace");
  assert.equal(typeof ws.loadWorkspaceMeta, "function");
  assert.equal(typeof ws.setMigrationCompleted, "function");
});

// Cloud integration tests (when env configured)
const cloudUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cloudKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (cloudUrl && cloudKey) {
  await test("Cloud: connect and read workspace_meta", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(cloudUrl, cloudKey);
    const { error } = await client.from("workspace_meta").select("key").limit(1);
    if (error?.message.includes("does not exist")) {
      throw new Error("Run supabase/migrations/001_initial_schema.sql first");
    }
    assert.ok(!error, error?.message);
  });

  await test("Cloud: round-trip design document", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(cloudUrl, cloudKey);
    const projectId = "audit-test-project";
    const designId = `audit-design-${Date.now()}`;
    const brand = SEED_PROJECTS[0].brand;
    const doc = blankCanvasDocument(brand);
    doc.elements.push(
      textElement({ name: "Headline", props: { content: "PERSISTENCE AUDIT" } }, brand),
    );

    await client.from("projects").upsert({
      id: projectId,
      code: "AUDIT",
      name: "Audit Test",
      client_name: "Test",
      format_id: "instagram-portrait",
      export_prefix: "audit",
      brand,
      is_seed: false,
    });

    await client.from("designs").upsert({
      id: designId,
      project_id: projectId,
      title: "Audit design",
      template: "document",
      kind: "single",
      status: "draft",
      number: "01",
      base_id: designId,
      export_kind: "jpg",
      duration_ms: 0,
      document: doc,
      design_state: { headline: "PERSISTENCE AUDIT" },
      reference_post_ids: [],
    });

    const { data, error } = await client.from("designs").select("*").eq("id", designId).single();
    assert.ok(!error, error?.message);
    const loaded = data!.document as DesignDocument;
    assert.equal(loaded.schemaVersion ?? 1, 1);
    assert.equal(
      (loaded.elements.find((e) => e.name === "Headline")?.props as { content: string }).content,
      "PERSISTENCE AUDIT",
    );

    await client.from("design_versions").insert({
      design_id: designId,
      version_number: 1,
      document: doc,
      design_state: data!.design_state,
      label: "Audit v1",
    });

    const { data: versions } = await client
      .from("design_versions")
      .select("*")
      .eq("design_id", designId);
    assert.ok((versions ?? []).length >= 1);

    await client.from("design_versions").delete().eq("design_id", designId);
    await client.from("designs").delete().eq("id", designId);
    await client.from("projects").delete().eq("id", projectId);
  });
} else {
  console.log("ℹ Supabase not configured — cloud integration tests skipped");
}

console.log("\n--- Persistence audit ---");
const failed = results.filter((r) => !r.ok);
console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
if (failed.length) {
  for (const f of failed) console.log(`  FAIL: ${f.name} — ${f.detail}`);
  process.exit(1);
}
