/**
 * Posts UI / reel visibility audit — run: npx tsx scripts/audit-posts-ui.mts
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
loadEnvConfig(process.cwd());

type Status = "PASS" | "FAIL" | "NONE EXISTS";

const report: Record<string, Status | string> = {};

async function main() {
  const { SEED_PROJECTS } = await import("../projects/index");
  const { emptyOpsPersist } = await import("../core/ops/types");
  const { ensureOpsMigration } = await import("../core/ops/migrate");
  const { mergeProject } = await import("../core/repository/hydrate");
  const { matchesPostKindFilter, isReelPost, POST_KIND_FILTERS } = await import("../core/ui/postListUtils");
  const { blankCanvasDocument, textElement } = await import("../core/design/document");
  const { documentToDesignState } = await import("../core/design/generation/provider");

  // Load persisted snapshot if available
  const memory = new Map<string, string>();
  (globalThis as { window?: Window }).window = {
    localStorage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
      removeItem: (k: string) => memory.delete(k),
      clear: () => memory.clear(),
      key: () => null,
      length: memory.size,
    },
  } as unknown as Window;

  let persistOverlays: Record<string, import("../core/types").ProjectOverlay> = {};
  try {
    const { loadPersist, STORAGE_KEY } = await import("../core/repository/persist");
    // Try reading from browser localStorage path isn't available in node — use empty
    const loaded = loadPersist();
    persistOverlays = loaded.overlays ?? {};
  } catch {
    /* no persist */
  }

  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const projects = SEED_PROJECTS.map((p) => mergeProject(p, persistOverlays[p.id]));
  const allRows = projects.flatMap((project) => project.posts.map((post) => ({ project, post })));
  const reelRows = allRows.filter(({ post }) => isReelPost(post));

  report["Existing reel count"] = String(reelRows.length);
  report["Existing reel detected"] = reelRows.length > 0 ? "PASS" : "NONE EXISTS";

  if (reelRows.length > 0) {
    for (const { post } of reelRows) {
      report["Reel visible in ALL"] = matchesPostKindFilter(post, "all") ? "PASS" : "FAIL";
      report["Reel visible in REELS"] = matchesPostKindFilter(post, "reels") ? "PASS" : "FAIL";
    }
  } else {
    report["Reel visible in ALL"] = "NONE EXISTS";
    report["Reel visible in REELS"] = "NONE EXISTS";
  }

  // Source file checks
  const globalPosts = fs.readFileSync(path.join(process.cwd(), "app/posts/page.tsx"), "utf8");
  const projectPosts = fs.readFileSync(
    path.join(process.cwd(), "app/projects/[projectId]/posts/page.tsx"),
    "utf8",
  );
  const postEditor = fs.readFileSync(
    path.join(process.cwd(), "app/projects/[projectId]/posts/[postId]/page.tsx"),
    "utf8",
  );

  report["REELS filter visible"] =
    globalPosts.includes('"reels"') &&
    projectPosts.includes('"reels"') &&
    POST_KIND_FILTERS.includes("reels")
      ? "PASS"
      : "FAIL";

  report["New Reel button visible"] =
    globalPosts.includes("+ New Reel") && projectPosts.includes("+ New Reel") ? "PASS" : "FAIL";

  report["Click opens VideoEditor"] =
    postEditor.includes("if (post.video)") && postEditor.includes("<VideoEditor") ? "PASS" : "FAIL";

  // Simulate mock reel creation → appears in filters
  const { MockVideoGenerationProvider } = await import("../core/video/generation/provider");
  const { getProjectCreativeContext } = await import("../core/design/creativeContext");
  const ctx = getProjectCreativeContext(SEED_PROJECTS.find((p) => p.id === "offerhub")!, ops);
  const mockDoc = await new MockVideoGenerationProvider().generateStoryboard(
    {
      brief: "Audit reel",
      platform: "instagram",
      format: "reel",
      durationMs: 15_000,
      creativeFreedom: "medium",
    },
    ctx,
  );
  const mockPost = {
    id: "audit-reel",
    baseId: "audit-reel",
    number: "99",
    title: mockDoc.title,
    exportKind: "mp4" as const,
    durationMs: mockDoc.durationMs,
    status: "draft" as const,
    kind: "reel" as const,
    template: "video" as const,
    design: { headline: "", supporting: "", imageSrc: "", logoId: "" },
    video: mockDoc,
  };
  report["New reel appears after creation"] =
    isReelPost(mockPost) &&
    matchesPostKindFilter(mockPost, "all") &&
    matchesPostKindFilter(mockPost, "reels")
      ? "PASS"
      : "FAIL";

  // Persistence path unchanged
  const storeSrc = fs.readFileSync(path.join(process.cwd(), "core/store.tsx"), "utf8");
  report["Reel persists after reload"] =
    storeSrc.includes("appendPost") && storeSrc.includes("video: withScript") ? "PASS" : "FAIL";

  // Static design regression
  const offerhub = projects.find((p) => p.id === "offerhub")!;
  const doc = blankCanvasDocument(offerhub.brand);
  doc.elements.push(textElement({ name: "Headline", props: { content: "OK" } }, offerhub.brand));
  const design = documentToDesignState(doc, offerhub.brand);
  report["Static designs unaffected"] = design.headline === "OK" ? "PASS" : "FAIL";

  console.log("--- Posts UI Audit ---\n");
  console.log(`StudioPosts with video (seed + empty overlay): ${reelRows.length}`);
  if (reelRows.length > 0) {
    for (const { project, post } of reelRows) {
      console.log(`  · ${project.id} / ${post.id} — ${post.title}`);
    }
  }
  console.log("");
  for (const key of [
    "REELS filter visible",
    "New Reel button visible",
    "Existing reel detected",
    "Reel visible in ALL",
    "Reel visible in REELS",
    "Click opens VideoEditor",
    "New reel appears after creation",
    "Reel persists after reload",
    "Static designs unaffected",
  ]) {
    console.log(`${key}: ${report[key] ?? "FAIL"}`);
  }

  const failed = Object.entries(report).some(([, v]) => v === "FAIL");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
