/**
 * DesignDocument workflow audit — run: npx tsx scripts/audit-design-workflow.mts
 */
import assert from "node:assert/strict";
import { SEED_PROJECTS } from "../projects/index";
import { blankCanvasDocument, cloneDocument, textElement } from "../core/design/document";
import type { DesignDocument } from "../core/design/document";
import { getProjectCreativeContext } from "../core/design/creativeContext";
import {
  MockDesignGenerationProvider,
  documentToDesignState,
} from "../core/design/generation/provider";
import type { GenerateDesignBrief, VariationMode } from "../core/design/generation/provider";
import {
  SEED_DESIGN_TEMPLATES,
  applyTemplateToBrand,
  getDesignTemplate,
  listDesignTemplates,
  postToTemplate,
} from "../core/design/templateLibrary";
import { emptyOpsPersist } from "../core/ops/types";
import { ensureOpsMigration } from "../core/ops/migrate";
import type {
  AppPersist,
  PostPatch,
  ProjectConfig,
  ProjectOverlay,
  StudioPost,
} from "../core/types";

// --- replicate store hydration (pure) ---

function applyPostPatch(post: StudioPost, patch?: PostPatch): StudioPost {
  if (!patch) return structuredClone(post);
  const next = structuredClone(post);
  if (patch.status) next.status = patch.status;
  if (patch.title) next.title = patch.title;
  if (patch.design) next.design = { ...next.design, ...patch.design };
  if (patch.document) next.document = patch.document;
  if (patch.referencePostIds) next.referencePostIds = patch.referencePostIds;
  return next;
}

function hydratePosts(base: StudioPost[], overlay?: ProjectOverlay["posts"]): StudioPost[] {
  const byId = new Map<string, StudioPost>();
  for (const post of base) byId.set(post.id, structuredClone(post));
  for (const extra of overlay?.extras ?? []) byId.set(extra.id, structuredClone(extra));
  const deleted = new Set(overlay?.deletedIds ?? []);
  const posts: StudioPost[] = [];
  for (const [id, post] of byId) {
    if (deleted.has(id)) continue;
    posts.push(applyPostPatch(post, overlay?.patches[id]));
  }
  const order = overlay?.order?.length ? overlay.order : base.map((post) => post.id);
  const mapped = order
    .map((id) => posts.find((post) => post.id === id))
    .filter((post): post is StudioPost => Boolean(post));
  const missing = posts.filter((post) => !order.includes(post.id));
  return [...mapped, ...missing];
}

function mergeProject(base: ProjectConfig, overlay?: ProjectOverlay): ProjectConfig {
  return {
    ...base,
    posts: hydratePosts(base.posts, overlay?.posts),
  };
}

// --- mock localStorage ---

const memory = new Map<string, string>();

function mockWindow() {
  (globalThis as { window?: Window }).window = {
    localStorage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
      clear: () => memory.clear(),
      key: () => null,
      length: memory.size,
    },
  } as unknown as Window;
}

async function loadPersistModule() {
  mockWindow();
  return import("../core/repository/persist");
}

function patchDocument(
  overlay: ProjectOverlay,
  postId: string,
  document: DesignDocument,
  design: ReturnType<typeof documentToDesignState>,
): ProjectOverlay {
  const posts = overlay.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
  return {
    ...overlay,
    posts: {
      ...posts,
      patches: {
        ...posts.patches,
        [postId]: {
          ...(posts.patches[postId] ?? {}),
          document,
          design,
        },
      },
    },
  };
}

function appendDocumentPost(
  overlay: ProjectOverlay,
  project: ProjectConfig,
  post: StudioPost,
): ProjectOverlay {
  const posts = overlay.posts ?? {
    order: project.posts.map((p) => p.id),
    extras: [],
    patches: {},
    deletedIds: [],
  };
  return {
    ...overlay,
    posts: {
      ...posts,
      extras: [...posts.extras, post],
      order: [...(posts.order.length ? posts.order : project.posts.map((p) => p.id)), post.id],
    },
  };
}

// --- tests ---

const results: { name: string; ok: boolean; detail?: string }[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`✓ ${name}`);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      results.push({ name, ok: false, detail });
      console.error(`✗ ${name}: ${detail}`);
    }
  })();
}

const offerhub = SEED_PROJECTS.find((p) => p.id === "offerhub")!;
const senda = SEED_PROJECTS.find((p) => p.id === "senda")!;
const provider = new MockDesignGenerationProvider();

await test("Blank canvas is 1080×1440 with brand background", () => {
  const doc = blankCanvasDocument(offerhub.brand);
  assert.equal(doc.canvas.width, 1080);
  assert.equal(doc.canvas.height, 1440);
  assert.equal(doc.canvas.backgroundColorId, offerhub.brand.defaultBackground);
  assert.equal(doc.elements.length, 0);
});

await test("Seed templates include Offer-Hub and Senda legacy + document", () => {
  assert.ok(SEED_DESIGN_TEMPLATES.some((t) => t.id.includes("offerhub") && t.mode === "legacy"));
  assert.ok(SEED_DESIGN_TEMPLATES.some((t) => t.id.includes("senda") && t.mode === "legacy"));
  assert.ok(SEED_DESIGN_TEMPLATES.some((t) => t.name.includes("(document)")));
  const listed = listDesignTemplates("offerhub");
  assert.ok(listed.length >= 10);
});

await test("From template (document) produces editable document post", () => {
  const tpl = getDesignTemplate("blank-canvas")!;
  const applied = applyTemplateToBrand(tpl, offerhub.brand);
  assert.equal(applied.template, "document");
  assert.ok(applied.document);
  assert.ok(applied.design);
});

await test("From template (legacy) preserves React template id", () => {
  const legacy = SEED_DESIGN_TEMPLATES.find(
    (t) => t.projectId === "offerhub" && t.mode === "legacy" && t.legacyTemplate === "oh-editorial",
  );
  assert.ok(legacy);
  const applied = applyTemplateToBrand(legacy!, offerhub.brand);
  assert.equal(applied.template, "oh-editorial");
  assert.equal(applied.document, undefined);
});

await test("Mock AI generateDesign returns document + synced design", async () => {
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const brief: GenerateDesignBrief = {
    brief: "Trust and secure payments for global freelancers",
    platform: "instagram",
    format: "post",
    outputKind: "static",
    creativeFreedom: "medium",
  };
  const result = await provider.generateDesign(brief, ctx, []);
  assert.equal(result.template, "document");
  assert.ok(result.document.elements.length > 0);
  assert.ok(result.document.elements.some((e) => e.type === "text"));
  const synced = documentToDesignState(result.document, offerhub.brand);
  assert.equal(synced.headline, result.design.headline);
});

await test("Generate variations — all four modes produce documents", async () => {
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const base = blankCanvasDocument(offerhub.brand);
  base.elements.push(
    textElement({ name: "Headline", props: { content: "TEST HEADLINE", fontSize: 80 } }, offerhub.brand),
  );
  const modes: VariationMode[] = [
    "same_content_new_layout",
    "same_layout_new_content",
    "color_variation",
    "more_experimental",
  ];
  for (const mode of modes) {
    const varied = await provider.generateVariation(base, mode, ctx);
    assert.ok(varied.elements.length > 0, mode);
    assert.equal(varied.metadata.generatedBy, "variation");
  }
});

await test("Use as template round-trips document structure", () => {
  const doc = blankCanvasDocument(senda.brand);
  doc.elements.push(
    textElement({ name: "Headline", x: 120, y: 300, props: { content: "SAVED", colorId: "text" } }, senda.brand),
  );
  const post: StudioPost = {
    id: "test-post",
    baseId: "test-post",
    number: "99",
    title: "Test",
    exportKind: "jpg",
    durationMs: 0,
    status: "draft",
    kind: "single",
    template: "document",
    design: documentToDesignState(doc, senda.brand),
    document: doc,
  };
  const tpl = postToTemplate("senda", post, senda.brand, "My template");
  assert.equal(tpl.mode, "document");
  assert.ok(tpl.document);
  const applied = applyTemplateToBrand(tpl, senda.brand);
  const headline = applied.document!.elements.find((e) => e.name === "Headline");
  assert.equal((headline!.props as { content: string }).content, "SAVED");
  assert.equal(headline!.x, 120);
});

await test("Persistence: create → edit text/position/color → reload", async () => {
  memory.clear();
  const { savePersist, loadPersist, STORAGE_KEY } = await loadPersistModule();

  let persist: AppPersist = {
    version: 2,
    userProjects: [],
    overlays: {},
    ops: ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS),
  };

  const postId = "design-audit-1";
  const doc = blankCanvasDocument(offerhub.brand);
  const headline = textElement(
    { id: "hl-1", name: "Headline", x: 80, y: 200, props: { content: "ORIGINAL", colorId: "text", fontSize: 72 } },
    offerhub.brand,
  );
  doc.elements.push(headline);

  const post: StudioPost = {
    id: postId,
    baseId: postId,
    number: "10",
    title: "Audit design",
    exportKind: "jpg",
    durationMs: 0,
    status: "draft",
    kind: "single",
    template: "document",
    design: documentToDesignState(doc, offerhub.brand),
    document: doc,
  };

  persist = {
    ...persist,
    overlays: {
      ...persist.overlays,
      offerhub: appendDocumentPost(persist.overlays.offerhub ?? {}, offerhub, post),
    },
  };
  savePersist(persist);

  // Simulate edit
  const loaded1 = loadPersist();
  const merged1 = mergeProject(offerhub, loaded1.overlays.offerhub);
  const found1 = merged1.posts.find((p) => p.id === postId);
  assert.ok(found1?.document);

  const editedDoc = cloneDocument(found1!.document!);
  const el = editedDoc.elements.find((e) => e.id === "hl-1")!;
  (el.props as { content: string }).content = "EDITED TEXT";
  el.x = 150;
  el.y = 320;
  (el.props as { colorId: string }).colorId = "accent";
  editedDoc.canvas.backgroundColorId = "primary";

  const syncedDesign = documentToDesignState(editedDoc, offerhub.brand);
  persist = {
    ...loaded1,
    overlays: {
      ...loaded1.overlays,
      offerhub: patchDocument(loaded1.overlays.offerhub ?? {}, postId, editedDoc, syncedDesign),
    },
  };
  savePersist(persist);

  // Simulate browser reload
  memory.clear();
  memory.set(STORAGE_KEY, JSON.stringify(persist));
  const reloaded = loadPersist();
  const merged2 = mergeProject(offerhub, reloaded.overlays.offerhub);
  const found2 = merged2.posts.find((p) => p.id === postId);

  assert.ok(found2?.document, "document survives reload");
  const hl = found2!.document!.elements.find((e) => e.id === "hl-1")!;
  assert.equal((hl.props as { content: string }).content, "EDITED TEXT");
  assert.equal(hl.x, 150);
  assert.equal(hl.y, 320);
  assert.equal((hl.props as { colorId: string }).colorId, "accent");
  assert.equal(found2!.document!.canvas.backgroundColorId, "primary");
  assert.equal(found2!.design.headline, "EDITED TEXT");
});

await test("Persistence: saved templates in ops.designTemplates survive reload", async () => {
  memory.clear();
  const { savePersist, loadPersist, STORAGE_KEY } = await loadPersistModule();

  const doc = blankCanvasDocument(offerhub.brand);
  const tpl = postToTemplate("offerhub", {
    id: "x",
    baseId: "x",
    number: "01",
    title: "T",
    exportKind: "jpg",
    durationMs: 0,
    status: "draft",
    kind: "single",
    template: "document",
    design: documentToDesignState(doc, offerhub.brand),
    document: doc,
  }, offerhub.brand, "Persisted template");

  const persist: AppPersist = {
    version: 2,
    userProjects: [],
    overlays: {},
    ops: {
      ...ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS),
      designTemplates: [tpl],
    },
  };
  savePersist(persist);

  memory.clear();
  memory.set(STORAGE_KEY, JSON.stringify(persist));
  const loaded = loadPersist();
  assert.equal(loaded.ops?.designTemplates.length, 1);
  assert.equal(loaded.ops?.designTemplates[0].name, "Persisted template");
});

await test("Legacy Offer-Hub/Senda posts unchanged after document overlay", () => {
  const postId = "design-audit-legacy-check";
  const doc = blankCanvasDocument(offerhub.brand);
  const post: StudioPost = {
    id: postId,
    baseId: postId,
    number: "11",
    title: "New doc",
    exportKind: "jpg",
    durationMs: 0,
    status: "draft",
    kind: "single",
    template: "document",
    design: documentToDesignState(doc, offerhub.brand),
    document: doc,
  };

  const overlay: ProjectOverlay = appendDocumentPost({}, offerhub, post);
  const mergedOh = mergeProject(offerhub, overlay);
  const mergedSe = mergeProject(senda, overlay);

  const seedOh = offerhub.posts.find((p) => p.template === "oh-editorial")!;
  const mergedOhPost = mergedOh.posts.find((p) => p.id === seedOh.id)!;
  assert.equal(mergedOhPost.template, "oh-editorial");
  assert.equal(mergedOhPost.document, undefined);
  assert.equal(mergedOhPost.design.headline, seedOh.design.headline);

  const seedSe = senda.posts.find((p) => p.status === "active")!;
  const mergedSePost = mergedSe.posts.find((p) => p.id === seedSe.id)!;
  assert.equal(mergedSePost.template, seedSe.template);
  assert.equal(mergedSePost.document, undefined);
});

await test("documentToDesignState stays in sync after document edits", () => {
  const doc = blankCanvasDocument(offerhub.brand);
  doc.elements.push(
    textElement({ name: "Headline", props: { content: "SYNC ME" } }, offerhub.brand),
    textElement({ name: "Supporting", y: 500, props: { content: "Support copy" } }, offerhub.brand),
  );
  const design = documentToDesignState(doc, offerhub.brand);
  assert.equal(design.headline, "SYNC ME");
  assert.equal(design.supporting, "Support copy");
});

await test("Reference post ids persist on generated design", async () => {
  memory.clear();
  const { savePersist, loadPersist } = await loadPersistModule();
  const postId = "design-ref-1";
  const doc = blankCanvasDocument(offerhub.brand);
  const post: StudioPost = {
    id: postId,
    baseId: postId,
    number: "12",
    title: "With refs",
    exportKind: "jpg",
    durationMs: 0,
    status: "draft",
    kind: "single",
    template: "document",
    design: documentToDesignState(doc, offerhub.brand),
    document: doc,
    referencePostIds: ["oh-01", "oh-02"],
  };

  const persist: AppPersist = {
    version: 2,
    userProjects: [],
    overlays: { offerhub: appendDocumentPost({}, offerhub, post) },
    ops: ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS),
  };
  savePersist(persist);
  const loaded = loadPersist();
  const merged = mergeProject(offerhub, loaded.overlays.offerhub);
  const found = merged.posts.find((p) => p.id === postId);
  assert.deepEqual(found?.referencePostIds, ["oh-01", "oh-02"]);
});

// --- summary ---

const failed = results.filter((r) => !r.ok);
console.log("\n--- Audit summary ---");
console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
if (failed.length) {
  console.log("Failed:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
} else {
  console.log("All audit checks passed.");
}
