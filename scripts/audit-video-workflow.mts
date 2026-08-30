/**
 * VideoDocument / reel workflow audit — run: npm run audit:video
 */
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
loadEnvConfig(process.cwd());

import { SEED_PROJECTS } from "../projects/index";
import { blankCanvasDocument, textElement } from "../core/design/document";
import { documentToDesignState } from "../core/design/generation/provider";
import { emptyOpsPersist } from "../core/ops/types";
import { ensureOpsMigration } from "../core/ops/migrate";
import { getProjectCreativeContext } from "../core/design/creativeContext";
import type { AppPersist, PostPatch, ProjectConfig, ProjectOverlay, StudioPost } from "../core/types";
import {
  blankReelDocument,
  cloneVideoDocument,
  syncVideoDuration,
  uid,
  type VideoDocument,
  type VideoScene,
} from "../core/video/document";
import {
  applyScriptToDocument,
  buildVoiceoverScript,
  getEffectiveVoiceoverScript,
  resetVoiceoverToSceneScripts,
  sceneScriptsChangedSinceManualOverride,
  setVoiceoverManualOverride,
} from "../core/video/script";
import { attachCaptionsToDocument, generateCaptionsFromScenes } from "../core/video/captions";
import { MockVideoGenerationProvider } from "../core/video/generation/provider";
import { isClaudeCreditOrQuotaError } from "../core/video/generation/claude-errors";
import {
  claudeOutputToVideoDocument,
  extractJsonFromResponse,
  parseClaudeStoryboardJson,
  validateClaudeStoryboard,
  resolveStoryboardProvider,
  formatValidationErrors,
} from "../core/video/generation/validate";
import {
  buildStoryboardUserPrompt,
  collectReferenceImageUrls,
} from "../core/video/generation/context-prompt";
import { videoCompositionMeta } from "../core/video/remotion/VideoDocumentRenderer";
import { canRenderOnPlatform } from "../core/video/render/provider";
import {
  collectVideoAssetRefs,
  estimateMp3DurationMs,
  getVoiceoverTimingStatus,
} from "../core/video/voiceover";
import { applyPostPatch } from "../core/repository/hydrate";

function mergeProject(base: ProjectConfig, overlay?: ProjectOverlay): ProjectConfig {
  const byId = new Map<string, StudioPost>();
  for (const post of base.posts) byId.set(post.id, structuredClone(post));
  for (const extra of overlay?.posts?.extras ?? []) byId.set(extra.id, structuredClone(extra));
  const deleted = new Set(overlay?.posts?.deletedIds ?? []);
  const posts: StudioPost[] = [];
  for (const [id, post] of byId) {
    if (deleted.has(id)) continue;
    posts.push(applyPostPatch(post, overlay?.posts?.patches[id]));
  }
  const order = overlay?.posts?.order?.length ? overlay.posts.order : base.posts.map((p) => p.id);
  const mapped = order
    .map((id) => posts.find((p) => p.id === id))
    .filter((p): p is StudioPost => Boolean(p));
  const missing = posts.filter((p) => !order.includes(p.id));
  return { ...base, posts: [...mapped, ...missing] };
}

const memory = new Map<string, string>();

function mockWindow() {
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
}

async function loadPersistModule() {
  mockWindow();
  return import("../core/repository/persist");
}

function appendVideoPost(overlay: ProjectOverlay, post: StudioPost): ProjectOverlay {
  const posts = overlay.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
  return {
    ...overlay,
    posts: {
      ...posts,
      extras: [...posts.extras, post],
      order: [...posts.order, post.id],
    },
  };
}

function patchVideo(overlay: ProjectOverlay, postId: string, video: VideoDocument): ProjectOverlay {
  const posts = overlay.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
  return {
    ...overlay,
    posts: {
      ...posts,
      patches: {
        ...posts.patches,
        [postId]: { ...(posts.patches[postId] ?? {}), video },
      },
    },
  };
}

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
const provider = new MockVideoGenerationProvider();

function makeValidClaudeOutput(durationMs: number, sceneCount: number) {
  const perScene = Math.floor(durationMs / sceneCount);
  return {
    title: "Test Reel",
    voiceoverScript: Array.from({ length: sceneCount }, (_, i) => `Scene ${i + 1} line.`).join(" "),
    scenes: Array.from({ length: sceneCount }, (_, i) => ({
      durationMs: i === sceneCount - 1 ? durationMs - perScene * (sceneCount - 1) : perScene,
      script: `Scene ${i + 1} voiceover line for testing.`,
      elements: [
        {
          type: "text" as const,
          name: "Headline",
          x: 80,
          y: 800,
          width: 920,
          height: 160,
          content: `Scene ${i + 1} headline`,
          fontSize: 64,
          animationIn: "fade-up" as const,
        },
      ],
    })),
  };
}

const storyboardBrief = {
  brief: "Show how Offer-Hub helps freelancers get paid globally",
  platform: "instagram",
  format: "reel",
  style: "editorial",
  durationMs: 15_000,
  creativeFreedom: "medium" as const,
  generateCaptions: false,
};

await test("blankReelDocument defaults to 1080×1920 · 15s", () => {
  const doc = blankReelDocument("offerhub", "Test reel");
  assert.equal(doc.width, 1080);
  assert.equal(doc.height, 1920);
  assert.equal(doc.fps, 30);
  assert.equal(doc.durationMs, 15_000);
  assert.equal(doc.scenes.length, 1);
});

await test("syncVideoDuration recalculates scene startMs and total duration", () => {
  let doc = blankReelDocument("offerhub", "Timing");
  doc = syncVideoDuration({
    ...doc,
    scenes: [
      { ...doc.scenes[0]!, id: "a", durationMs: 4000, startMs: 0, elements: [] },
      { ...doc.scenes[0]!, id: "b", durationMs: 6000, startMs: 0, elements: [] },
    ],
  });
  assert.equal(doc.durationMs, 10_000);
  assert.equal(doc.scenes[0]!.startMs, 0);
  assert.equal(doc.scenes[1]!.startMs, 4000);
});

await test("add / remove / reorder scenes", () => {
  let doc = blankReelDocument("offerhub", "Scenes");
  const extra: VideoScene = {
    id: uid("scene"),
    startMs: 0,
    durationMs: 3000,
    script: "Second scene.",
    elements: [],
  };
  doc = syncVideoDuration({ ...doc, scenes: [...doc.scenes, extra] });
  assert.equal(doc.scenes.length, 2);

  doc = syncVideoDuration({ ...doc, scenes: doc.scenes.filter((s) => s.id !== extra.id) });
  assert.equal(doc.scenes.length, 1);

  const a = { ...doc.scenes[0]!, id: "s1", durationMs: 2000 };
  const b = { ...doc.scenes[0]!, id: "s2", durationMs: 3000 };
  doc = syncVideoDuration({ ...doc, scenes: [b, a] });
  assert.equal(doc.scenes[0]!.id, "s2");
});

await test("edit text element in scene", () => {
  const doc = blankReelDocument(offerhub.id, "Edit");
  const next = cloneVideoDocument(doc);
  const el = next.scenes[0]!.elements[0]!;
  assert.equal(el.type, "text");
  (el.props as { content: string }).content = "UPDATED HEADLINE";
  assert.equal((next.scenes[0]!.elements[0]!.props as { content: string }).content, "UPDATED HEADLINE");
});

await test("change scene duration updates total", () => {
  let doc = blankReelDocument("offerhub", "Dur");
  doc = syncVideoDuration({
    ...doc,
    scenes: [{ ...doc.scenes[0]!, durationMs: 8000 }],
  });
  assert.equal(doc.durationMs, 8000);
});

await test("Mock storyboard generates 4–6 editable scenes with project context", async () => {
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const doc = await provider.generateStoryboard(
    {
      brief: "Show how Offer-Hub helps freelancers get paid globally with trust and speed",
      platform: "instagram",
      format: "reel",
      style: "editorial",
      durationMs: 15_000,
      creativeFreedom: "medium",
      generateCaptions: false,
    },
    ctx,
  );
  assert.ok(doc.scenes.length >= 4 && doc.scenes.length <= 6);
  assert.ok(doc.scenes.every((s) => s.elements.length > 0));
  assert.ok(doc.scenes.every((s) => s.script && s.script.length > 5));
  assert.ok(!doc.script?.toLowerCase().includes("show how offer-hub helps"));
  assert.ok(!doc.script?.toLowerCase().includes("join thousands"));
  assert.equal(doc.metadata.generatedBy, "mock");
});

await test("voiceover script is composed ONLY from scene.script", () => {
  const briefText =
    "Create a short Instagram reel introducing Offer-Hub. Keep it modern. Avoid invented statistics.";
  const doc = applyScriptToDocument(
    syncVideoDuration({
      ...blankReelDocument("offerhub", "Composition test"),
      metadata: { brief: briefText, platform: "instagram", format: "reel" },
      scenes: [
        {
          id: "s1",
          startMs: 0,
          durationMs: 3000,
          script: "Global work. Payment friction.",
          visualDirection: "Do not read this aloud.",
          elements: [
            {
              id: "t1",
              type: "text",
              name: "Headline",
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              opacity: 1,
              rotation: 0,
              zIndex: 1,
              startOffsetMs: 0,
              durationMs: 3000,
              props: { content: briefText, fontSize: 48, fontWeight: 700, color: "#fff", align: "center" },
            },
          ],
        },
        { id: "s2", startMs: 3000, durationMs: 3000, script: "Discover Offer-Hub.", elements: [] },
      ],
    }),
  );
  assert.equal(doc.script, "Global work. Payment friction. Discover Offer-Hub.");
  assert.ok(!doc.script?.includes("Create a short Instagram"));
  assert.ok(!doc.script?.includes("Avoid invented"));
});

await test("Offer-Hub mock storyboard avoids brief leakage and unsupported claims", async () => {
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const offerHubBrief =
    "Create a short Instagram reel introducing Offer-Hub as a global marketplace for businesses and freelancers.\n\nThe reel should communicate a simple problem-solution story: working with clients and freelancers internationally can create friction around payments, trust and project coordination. Offer-Hub brings the process together in one platform with direct communication, progress tracking and secure payments powered by Stellar.\n\nKeep it modern, energetic and product-focused. Avoid invented statistics or claims.\n\nEnd with a simple invitation to discover Offer-Hub.";

  const doc = await provider.generateStoryboard(
    {
      brief: offerHubBrief,
      platform: "instagram",
      format: "reel",
      style: "energetic",
      durationMs: 15_000,
      creativeFreedom: "medium",
      generateCaptions: true,
      title: "Offer-Hub Intro Reel",
    },
    ctx,
  );

  const voiceover = doc.script ?? "";
  const lower = voiceover.toLowerCase();
  const briefLower = offerHubBrief.toLowerCase();

  assert.equal(doc.scenes.length, 5);
  assert.ok(!lower.includes("create a short instagram"));
  assert.ok(!lower.includes("the reel should"));
  assert.ok(!lower.includes("keep it modern"));
  assert.ok(!lower.includes("avoid invented"));
  assert.ok(!lower.includes("join thousands"));
  assert.ok(!lower.includes("thousands who trust"));
  assert.ok(!/\d+\+?\s*(users|customers)/i.test(voiceover));

  for (const phrase of ["create a short", "the reel should", "avoid invented", "keep it modern"]) {
    assert.ok(!lower.includes(phrase), `instruction leak: ${phrase}`);
  }

  assert.ok(doc.scenes[0]!.script && doc.scenes[0]!.script.length > 5);
  assert.ok(doc.scenes.every((s) => s.visualDirection && s.visualDirection.length > 10));
  assert.equal(buildVoiceoverScript(doc.scenes), voiceover);

  const { estimateNarrationDurationMs } = require("../core/video/script-validation");
  const est = estimateNarrationDurationMs(voiceover);
  assert.ok(est <= 20_000, `voiceover estimate ${est}ms should be reasonable for ~15s reel`);

  assert.ok(doc.scenes[0]!.script!.length < 80);
  assert.ok(doc.scenes[4]!.script!.toLowerCase().includes("offer-hub") || doc.scenes[4]!.script!.toLowerCase().includes("discover"));

  assert.ok(doc.captions);
  assert.ok(doc.captions!.segments.length >= 1);
  assert.ok(doc.captions!.segments.every((seg) => voiceover.includes(seg.text) || doc.scenes.some((s) => s.script?.includes(seg.text))));

  assert.ok(!briefLower.includes(voiceover) || voiceover.length < briefLower.length / 2);
});

await test("voiceover validation blocks instruction leakage before TTS", () => {
  const { validateVoiceoverScript, formatVoiceoverValidationError } = require("../core/video/script-validation");
  const bad = validateVoiceoverScript(
    "Create a short Instagram reel introducing Offer-Hub as a global marketplace.",
  );
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.some((i: { kind: string }) => i.kind === "instruction_leak"));
  assert.ok(formatVoiceoverValidationError(bad).includes("Review the voiceover script"));

  const claim = validateVoiceoverScript("Join thousands who trust OFFER-HUB for payments.");
  assert.equal(claim.ok, false);
  assert.ok(claim.issues.some((i: { kind: string }) => i.kind === "unsupported_claim"));

  const good = validateVoiceoverScript(
    "Global work. Payment friction. Offer-Hub brings everything into one platform. Discover Offer-Hub.",
  );
  assert.equal(good.ok, true);
});

await test("estimated narration duration warns when exceeding reel length", () => {
  const { estimateNarrationDurationMs, narrationExceedsReel } = require("../core/video/script-validation");
  const longScript = "word ".repeat(120).trim();
  const est = estimateNarrationDurationMs(longScript);
  assert.ok(est > 15_000);
  assert.equal(narrationExceedsReel(longScript, 15_000), true);
  assert.equal(narrationExceedsReel("Short script.", 15_000), false);
});

await test("manual voiceover override persists across edits, reload, and scene changes", async () => {
  const MANUAL_SCRIPT =
    "Global work shouldn't mean payment friction. Offer-Hub connects businesses and freelancers to communicate, track progress, and pay securely. Work globally with Offer-Hub.";

  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  let doc = await provider.generateStoryboard(
    {
      brief: "Offer-Hub marketplace reel",
      platform: "instagram",
      format: "reel",
      durationMs: 15_000,
      creativeFreedom: "medium",
      generateCaptions: false,
    },
    ctx,
  );

  const autoScript = doc.script ?? "";
  const sceneScriptsBefore = doc.scenes.map((s) => s.script);
  assert.notEqual(autoScript, MANUAL_SCRIPT);

  doc = setVoiceoverManualOverride(doc, MANUAL_SCRIPT);
  assert.equal(getEffectiveVoiceoverScript(doc), MANUAL_SCRIPT);
  assert.equal(doc.voiceoverScriptOverride, MANUAL_SCRIPT);

  // simulate re-render / scene-unrelated commit
  doc = applyScriptToDocument({ ...doc, title: "Edited title" });
  assert.equal(getEffectiveVoiceoverScript(doc), MANUAL_SCRIPT);

  // scene script edit must not overwrite manual override
  const editedScenes = doc.scenes.map((s, i) =>
    i === 0 ? { ...s, script: "Completely different scene line." } : s,
  );
  doc = applyScriptToDocument({ ...doc, scenes: editedScenes });
  assert.equal(getEffectiveVoiceoverScript(doc), MANUAL_SCRIPT);
  assert.equal(sceneScriptsChangedSinceManualOverride(doc), true);
  assert.notEqual(doc.scenes[0]!.script, sceneScriptsBefore[0]);

  const { estimateNarrationDurationMs } = require("../core/video/script-validation");
  assert.equal(estimateNarrationDurationMs(MANUAL_SCRIPT), estimateNarrationDurationMs(getEffectiveVoiceoverScript(doc)));

  // ElevenLabs payload would use exact manual script — no network call in this test
  const ttsPayload = { text: getEffectiveVoiceoverScript(doc), voiceId: "voice-test", projectId: "offerhub", reelId: doc.id };
  assert.equal(ttsPayload.text, MANUAL_SCRIPT);

  // persistence reload (F5)
  memory.clear();
  const { savePersist, loadPersist, STORAGE_KEY } = await loadPersistModule();
  const postId = "offerhub-manual-vo-test";
  const post: StudioPost = {
    id: postId,
    baseId: postId,
    number: "99",
    title: doc.title,
    exportKind: "mp4",
    durationMs: doc.durationMs,
    status: "draft",
    kind: "reel",
    template: "video",
    design: { headline: "", supporting: "", imageSrc: "", logoId: offerhub.brand.logos[0]?.id ?? "" },
    video: doc,
  };

  const persist: AppPersist = {
    version: 2,
    userProjects: [],
    overlays: { offerhub: appendVideoPost({}, post) },
    ops: ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS),
  };
  savePersist(persist);
  memory.set(STORAGE_KEY, JSON.stringify(persist));
  const reloaded = loadPersist();
  const merged = mergeProject(offerhub, reloaded.overlays.offerhub);
  const reloadedPost = merged.posts.find((p) => p.id === postId);
  assert.ok(reloadedPost?.video);
  assert.equal(getEffectiveVoiceoverScript(reloadedPost!.video!), MANUAL_SCRIPT);
  assert.equal(reloadedPost!.video!.voiceoverScriptOverride, MANUAL_SCRIPT);

  // reset restores automatic composition
  const reset = resetVoiceoverToSceneScripts(reloadedPost!.video!);
  assert.equal(reset.voiceoverScriptOverride, undefined);
  assert.equal(getEffectiveVoiceoverScript(reset), buildVoiceoverScript(reset.scenes));
  assert.notEqual(getEffectiveVoiceoverScript(reset), MANUAL_SCRIPT);
});

await test("Voiceover script combines scene scripts", () => {
  const doc = applyScriptToDocument(
    syncVideoDuration({
      ...blankReelDocument("x", "Script"),
      scenes: [
        { id: "1", startMs: 0, durationMs: 3000, script: "Hello world.", elements: [] },
        { id: "2", startMs: 3000, durationMs: 3000, script: "Second line.", elements: [] },
      ],
    }),
  );
  assert.equal(doc.script, "Hello world. Second line.");
  assert.equal(buildVoiceoverScript(doc.scenes), doc.script);
});

await test("Captions generated from scene timing and brand", () => {
  const doc = attachCaptionsToDocument(
    applyScriptToDocument(
      syncVideoDuration({
        ...blankReelDocument("x", "Caps"),
        scenes: [
          {
            id: "1",
            startMs: 0,
            durationMs: 4000,
            script: "First phrase. Second phrase.",
            elements: [],
          },
        ],
      }),
    ),
    offerhub.brand,
  );
  assert.ok(doc.captions);
  assert.ok(doc.captions!.segments.length >= 2);
  assert.equal(doc.captions!.fontFamily, offerhub.brand.fonts.body);
});

await test("Voiceover attachment stored on VideoDocument", () => {
  const doc = cloneVideoDocument(blankReelDocument("x", "VO"));
  doc.script = "Sample voiceover script.";
  doc.voiceover = {
    assetUrl: "https://example.com/vo.mp3",
    assetId: "vo-test",
    voiceId: "voice-1",
    modelId: "eleven_multilingual_v2",
    characterCount: doc.script.length,
    script: doc.script,
  };
  assert.ok(doc.voiceover?.assetUrl.includes(".mp3"));
  assert.equal(doc.voiceover?.characterCount, doc.script.length);
});

await test("Remotion composition meta is valid for VideoDocument", () => {
  const doc = blankReelDocument("x", "Remotion");
  const meta = videoCompositionMeta(doc);
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1920);
  assert.equal(meta.fps, 30);
  assert.ok(meta.durationInFrames > 0);
});

await test("Persistence: video post survives localStorage reload", async () => {
  memory.clear();
  const { savePersist, loadPersist, STORAGE_KEY } = await loadPersistModule();
  const postId = "video-audit-1";
  const video = blankReelDocument("offerhub", "Persisted reel");
  const post: StudioPost = {
    id: postId,
    baseId: postId,
    number: "50",
    title: "Audit reel",
    exportKind: "mp4",
    durationMs: video.durationMs,
    status: "draft",
    kind: "reel",
    template: "video",
    design: { headline: "", supporting: "", imageSrc: "", logoId: offerhub.brand.logos[0]?.id ?? "" },
    video,
  };

  let persist: AppPersist = {
    version: 2,
    userProjects: [],
    overlays: { offerhub: appendVideoPost({}, post) },
    ops: ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS),
  };
  savePersist(persist);

  const edited = cloneVideoDocument(video);
  edited.title = "Edited reel title";
  edited.scenes[0]!.durationMs = 5000;
  const synced = syncVideoDuration(edited);

  persist = {
    ...loadPersist(),
    overlays: {
      ...loadPersist().overlays,
      offerhub: patchVideo(loadPersist().overlays.offerhub ?? {}, postId, synced),
    },
  };
  savePersist(persist);

  memory.clear();
  memory.set(STORAGE_KEY, JSON.stringify(persist));
  const reloaded = loadPersist();
  const merged = mergeProject(offerhub, reloaded.overlays.offerhub);
  const found = merged.posts.find((p) => p.id === postId);
  assert.ok(found?.video);
  assert.equal(found!.video!.title, "Edited reel title");
  assert.equal(found!.video!.durationMs, 5000);
});

await test("DesignDocument workflow still intact (regression)", () => {
  const doc = blankCanvasDocument(offerhub.brand);
  doc.elements.push(
    textElement({ name: "Headline", props: { content: "STILL WORKS" } }, offerhub.brand),
  );
  const design = documentToDesignState(doc, offerhub.brand);
  assert.equal(design.headline, "STILL WORKS");
});

await test("canRenderOnPlatform reports Vercel limitation honestly", () => {
  const prev = process.env.VERCEL;
  process.env.VERCEL = "1";
  assert.equal(canRenderOnPlatform(), false);
  delete process.env.VERCEL;
  if (prev) process.env.VERCEL = prev;
});

await test("Full Offer-Hub workflow: storyboard → edit → reorder → captions", async () => {
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  let doc = await provider.generateStoryboard(
    {
      brief: "Trust and secure payments for global freelancers on Offer-Hub",
      platform: "instagram",
      format: "reel",
      style: "editorial",
      durationMs: 15_000,
      creativeFreedom: "medium",
      generateCaptions: true,
      title: "Offer-Hub Trust Reel",
    },
    ctx,
  );

  assert.equal(doc.title, "Offer-Hub Trust Reel");
  assert.ok(doc.scenes.length >= 4);
  assert.ok(doc.captions && doc.captions.segments.length > 0);

  const assetRefs = collectVideoAssetRefs(doc);
  assert.ok(assetRefs.some((r) => r.type === "logo"), "logo asset in storyboard");
  assert.ok(
    assetRefs.some((r) => r.src.startsWith("/projects/offerhub/")),
    "project asset URLs present",
  );

  assert.ok(
    doc.scenes.some((s) => s.elements.some((e) => e.type === "text")),
    "storyboard has text elements",
  );
  const textEl = doc.scenes.flatMap((s) => s.elements).find((e) => e.type === "text")!;
  (textEl.props as { content: string }).content = "EDITED REEL HEADLINE";

  doc = syncVideoDuration({
    ...doc,
    scenes: [
      { ...doc.scenes[1]!, id: "first" },
      { ...doc.scenes[0]!, id: "second" },
      ...doc.scenes.slice(2),
    ],
  });
  assert.equal(doc.scenes[0]!.id, "first", "reorder works");

  doc = syncVideoDuration({
    ...doc,
    scenes: doc.scenes.map((s, i) => (i === 0 ? { ...s, durationMs: 5000 } : s)),
  });
  assert.ok(doc.durationMs >= 15_000 - 500, "duration change recalculated");

  doc = attachCaptionsToDocument(applyScriptToDocument(doc), offerhub.brand);
  assert.ok(doc.captions!.segments.length > 0);
});

await test("Asset URLs and voiceover survive persistence reload", async () => {
  memory.clear();
  const { savePersist, loadPersist, STORAGE_KEY } = await loadPersistModule();
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const doc = await provider.generateStoryboard(
    {
      brief: "Offer-Hub freelancer payments",
      platform: "instagram",
      format: "reel",
      durationMs: 15_000,
      creativeFreedom: "medium",
    },
    ctx,
  );
  const withVo = applyScriptToDocument(doc);
  withVo.voiceover = {
    assetUrl: "https://storage.example.com/offerhub/vo-test.mp3",
    assetId: "vo-test",
    voiceId: "voice-abc",
    modelId: "eleven_multilingual_v2",
    durationMs: 14_200,
    script: withVo.script,
  };

  const beforeRefs = collectVideoAssetRefs(withVo);
  const postId = "video-e2e-offerhub";
  const post: StudioPost = {
    id: postId,
    baseId: postId,
    number: "51",
    title: "Offer-Hub E2E Reel",
    exportKind: "mp4",
    durationMs: withVo.durationMs,
    status: "draft",
    kind: "reel",
    template: "video",
    design: { headline: "", supporting: "", imageSrc: "", logoId: offerhub.brand.logos[0]?.id ?? "" },
    video: withVo,
  };

  const persist: AppPersist = {
    version: 2,
    userProjects: [],
    overlays: { offerhub: appendVideoPost({}, post) },
    ops,
  };
  savePersist(persist);

  memory.clear();
  memory.set(STORAGE_KEY, JSON.stringify(persist));
  const reloaded = loadPersist();
  const merged = mergeProject(offerhub, reloaded.overlays.offerhub);
  const found = merged.posts.find((p) => p.id === postId)!;

  assert.ok(found.video?.voiceover?.assetUrl.includes("vo-test.mp3"));
  assert.equal(found.video!.voiceover!.durationMs, 14_200);

  const afterRefs = collectVideoAssetRefs(found.video!);
  for (const ref of beforeRefs.filter((r) => r.type !== "voiceover")) {
    assert.ok(
      afterRefs.some((a) => a.src === ref.src),
      `asset URL survived reload: ${ref.src}`,
    );
  }
});

await test("Voiceover timing warning when audio exceeds reel duration", () => {
  const doc = syncVideoDuration(blankReelDocument("x", "Short reel", 10_000));
  doc.voiceover = {
    assetUrl: "https://example.com/long.mp3",
    voiceId: "v1",
    modelId: "eleven_multilingual_v2",
    durationMs: 18_500,
    script: "Long script.",
  };
  const status = getVoiceoverTimingStatus(doc);
  assert.ok(status);
  assert.equal(status!.exceedsReel, true);
  assert.equal(status!.overflowMs, 8500);
  assert.equal(status!.reelDurationMs, 10_000);
  assert.equal(status!.audioDurationMs, 18_500);
});

await test("Voiceover timing ok when audio fits reel", () => {
  const doc = blankReelDocument("x", "Fit", 15_000);
  doc.voiceover = {
    assetUrl: "https://example.com/ok.mp3",
    voiceId: "v1",
    modelId: "eleven_multilingual_v2",
    durationMs: 12_000,
  };
  const status = getVoiceoverTimingStatus(doc)!;
  assert.equal(status.ok, true);
  assert.equal(status.exceedsReel, false);
});

await test("MP3 duration estimate from buffer size", () => {
  const buffer = Buffer.alloc(128_000);
  const ms = estimateMp3DurationMs(buffer, 128);
  assert.ok(ms >= 7000 && ms <= 9000, `expected ~8s, got ${ms}ms`);
});

await test("extractJsonFromResponse parses fenced and raw JSON", () => {
  const fenced = extractJsonFromResponse('Output:\n```json\n{"title":"Reel","scenes":[]}\n```');
  assert.equal(JSON.parse(fenced).title, "Reel");
  const raw = extractJsonFromResponse('prefix {"title":"Raw"} suffix');
  assert.equal(JSON.parse(raw).title, "Raw");
});

await test("parseClaudeStoryboardJson rejects malformed JSON", () => {
  const bad = parseClaudeStoryboardJson("not json at all");
  assert.ok(bad.error);
  const good = parseClaudeStoryboardJson('{"title":"Ok","scenes":[]}');
  assert.ok(good.data);
});

await test("validateClaudeStoryboard accepts valid 15s / 5-scene output", () => {
  const output = makeValidClaudeOutput(15_000, 5);
  const result = validateClaudeStoryboard(output, storyboardBrief);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.output.scenes.length, 5);
});

await test("validateClaudeStoryboard rejects too few scenes and duration drift", () => {
  const tooFew = validateClaudeStoryboard(makeValidClaudeOutput(15_000, 2), storyboardBrief);
  assert.equal(tooFew.ok, false);
  if (!tooFew.ok) {
    assert.ok(tooFew.errors.some((e) => e.path === "scenes"));
  }

  const drift = makeValidClaudeOutput(15_000, 5);
  drift.scenes[0]!.durationMs = 1000;
  const driftResult = validateClaudeStoryboard(drift, storyboardBrief);
  assert.equal(driftResult.ok, false);
  if (!driftResult.ok) {
    assert.ok(formatValidationErrors(driftResult.errors).includes("durationMs"));
  }
});

await test("claudeOutputToVideoDocument converts Claude JSON with project assets", () => {
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const output = makeValidClaudeOutput(15_000, 5);
  const doc = claudeOutputToVideoDocument(output, storyboardBrief, ctx, {
    generatedBy: "claude",
    modelId: "claude-sonnet-4-20250514",
  });
  assert.equal(doc.metadata.generatedBy, "claude");
  assert.equal(doc.scenes.length, 5);
  assert.ok(doc.scenes.every((s) => s.elements.length > 0));
  assert.equal(doc.durationMs, 15_000);
  assert.ok(doc.scenes.every((s) => s.script.length > 5));
});

await test("buildStoryboardUserPrompt includes project context without full workspace dump", () => {
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const prompt = buildStoryboardUserPrompt(storyboardBrief, ctx);
  assert.ok(prompt.includes(offerhub.brand.name));
  assert.ok(prompt.includes(storyboardBrief.brief));
  assert.ok(prompt.includes("availableAssets"));
  assert.ok(prompt.includes("creativeFreedomGuidance"));
  assert.ok(!prompt.includes('"userProjects"'));
});

await test("collectReferenceImageUrls resolves relative project asset paths", () => {
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const urls = collectReferenceImageUrls(ctx, "http://localhost:3000");
  assert.ok(Array.isArray(urls));
  assert.ok(urls.length <= 4);
  for (const url of urls) {
    assert.ok(url.startsWith("http://") || url.startsWith("https://"));
  }
});

await test("hydratePosts dedupes duplicate overlay.order ids", async () => {
  const { mergeProject, hydratePosts, dedupeIds } = await import("../core/repository/hydrate");
  const reelId = "reel-dup-test";
  const reelPost = {
    id: reelId,
    baseId: reelId,
    number: "99",
    title: "Duplicate order reel",
    exportKind: "mp4" as const,
    durationMs: 15_000,
    status: "draft" as const,
    kind: "reel" as const,
    template: "video" as const,
    design: { headline: "", supporting: "", imageSrc: "", logoId: "" },
    video: blankReelDocument("offerhub", "Duplicate order reel"),
  };
  const merged = mergeProject(offerhub, {
    posts: {
      order: [...offerhub.posts.map((p) => p.id), reelId, reelId],
      extras: [reelPost],
      patches: {},
      deletedIds: [],
    },
  });
  assert.equal(merged.posts.filter((p) => p.id === reelId).length, 1);

  const direct = hydratePosts(offerhub.posts, {
    order: [...offerhub.posts.map((p) => p.id), reelId, reelId],
    extras: [reelPost],
    patches: {},
    deletedIds: [],
  });
  assert.equal(direct.filter((p) => p.id === reelId).length, 1);
});

await test("appendPost overlay merge keeps one StudioPost per id after reload", async () => {
  const { mergeProject } = await import("../core/repository/hydrate");
  const { dedupePostRows } = await import("../core/ui/postListUtils");
  memory.clear();
  const { savePersist, loadPersist, STORAGE_KEY } = await loadPersistModule();
  const reelId = `reel-once-${Date.now()}`;
  const video = blankReelDocument("offerhub", "One reel");
  const post: StudioPost = {
    id: reelId,
    baseId: reelId,
    number: "77",
    title: "One reel",
    exportKind: "mp4",
    durationMs: video.durationMs,
    status: "draft",
    kind: "reel",
    template: "video",
    design: { headline: "", supporting: "", imageSrc: "", logoId: "" },
    video,
  };

  const persist: AppPersist = {
    version: 2,
    userProjects: [],
    overlays: {
      offerhub: {
        posts: {
          order: [...offerhub.posts.map((p) => p.id), reelId, reelId],
          extras: [post],
          patches: {},
          deletedIds: [],
        },
      },
    },
    ops: ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS),
  };
  savePersist(persist);
  memory.clear();
  memory.set(STORAGE_KEY, JSON.stringify(persist));
  const reloaded = loadPersist();
  const merged = mergeProject(offerhub, reloaded.overlays.offerhub);
  assert.equal(merged.posts.filter((p) => p.id === reelId).length, 1);

  const rows = dedupePostRows(merged.posts.map((p) => ({ project: merged, post: p })));
  assert.equal(rows.filter((r) => r.post.id === reelId).length, 1);
});

await test("resolveStoryboardProvider falls back to mock in dev without API key", () => {
  const prevKey = process.env.ANTHROPIC_API_KEY;
  const prevEnv = process.env.NODE_ENV;
  try {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.NODE_ENV = "development";
    assert.equal(resolveStoryboardProvider(), "mock");
    process.env.ANTHROPIC_API_KEY = "test-key";
    assert.equal(resolveStoryboardProvider(), "claude");
    delete process.env.ANTHROPIC_API_KEY;
    process.env.NODE_ENV = "production";
    assert.equal(resolveStoryboardProvider(), "unconfigured");
  } finally {
    if (prevKey) process.env.ANTHROPIC_API_KEY = prevKey;
    else delete process.env.ANTHROPIC_API_KEY;
    process.env.NODE_ENV = prevEnv ?? "development";
  }
});

await test("Claude credit error in development falls back to mock storyboard", async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const {
      generateStoryboardWithProvider,
      makeClaudeCreditError,
      MOCK_FALLBACK_LABEL,
      CLAUDE_CREDITS_UNAVAILABLE_MESSAGE,
    } = await import("../core/video/generation/claude-errors");
    const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
    const ctx = getProjectCreativeContext(offerhub, ops);

    const result = await generateStoryboardWithProvider({
      providerKind: "claude",
      brief: storyboardBrief,
      context: ctx,
      createClaude: () => ({
        getModelId: () => "claude-test",
        generateStoryboard: async () => {
          throw makeClaudeCreditError();
        },
      }),
    });
    assert.equal(result.provider, "mock");
    assert.equal(result.fallbackFromClaude, true);
    assert.equal(result.mockReason, MOCK_FALLBACK_LABEL);
    assert.equal(result.notice, CLAUDE_CREDITS_UNAVAILABLE_MESSAGE);
    assert.ok(result.video.scenes.length >= 4);
    assert.equal(result.video.metadata.generatedBy, "mock");
  } finally {
    process.env.NODE_ENV = prevEnv ?? "development";
  }
});

await test("Claude credit error in production does not fall back to mock", async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const { generateStoryboardWithProvider, makeClaudeCreditError } = await import(
      "../core/video/generation/claude-errors"
    );
    const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
    const ctx = getProjectCreativeContext(offerhub, ops);

    let threw = false;
    try {
      await generateStoryboardWithProvider({
        providerKind: "claude",
        brief: storyboardBrief,
        context: ctx,
        createClaude: () => ({
          getModelId: () => "claude-test",
          generateStoryboard: async () => {
            throw makeClaudeCreditError();
          },
        }),
      });
    } catch (err) {
      threw = true;
      assert.ok(isClaudeCreditOrQuotaError(err));
    }
    assert.equal(threw, true);
  } finally {
    process.env.NODE_ENV = prevEnv ?? "development";
  }
});

await test("UI mock fallback label is defined for credit errors", async () => {
  const { MOCK_FALLBACK_LABEL, formatStoryboardError, makeClaudeCreditError } = await import(
    "../core/video/generation/claude-errors"
  );
  assert.ok(MOCK_FALLBACK_LABEL.includes("Mock storyboard"));
  assert.ok(MOCK_FALLBACK_LABEL.includes("Claude credits unavailable"));
  const friendly = formatStoryboardError(makeClaudeCreditError());
  assert.ok(friendly.includes("mock storyboard"));
  assert.ok(!friendly.includes("invalid_request_error"));
});

await test("Mock fallback VideoDocument passes validation", async () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const { generateStoryboardWithProvider, makeClaudeCreditError } = await import(
      "../core/video/generation/claude-errors"
    );
    const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
    const ctx = getProjectCreativeContext(offerhub, ops);

    const result = await generateStoryboardWithProvider({
      providerKind: "claude",
      brief: storyboardBrief,
      context: ctx,
      createClaude: () => ({
        getModelId: () => "claude-test",
        generateStoryboard: async () => {
          throw makeClaudeCreditError();
        },
      }),
    });
    assert.ok(result.video.width === 1080);
    assert.ok(result.video.height === 1920);
    assert.ok(result.video.scenes.length >= 4 && result.video.scenes.length <= 6);
    assert.ok(result.video.scenes.every((s) => s.elements.length > 0));
  } finally {
    process.env.NODE_ENV = prevEnv ?? "development";
  }
});

await test("Video scene supports color, image, and video clip metadata", () => {
  const scene = blankReelDocument("offerhub", "Clip test").scenes[0]!;
  const withClip = {
    ...scene,
    script: "Freelancers get paid securely.",
    visualDirection: "Slow push-in on laptop payment screen.",
    background: {
      type: "video" as const,
      value: "https://example.com/clip.mp4",
      assetId: "clip-1",
      videoClip: {
        assetId: "clip-1",
        assetUrl: "https://example.com/clip.mp4",
        generationStatus: "ready" as const,
        generationPrompt: "9:16 payment scene",
        provider: "disabled",
        durationMs: 3000,
      },
    },
  };
  assert.equal(withClip.background?.type, "video");
  assert.equal(withClip.background?.videoClip?.generationStatus, "ready");
});

await test("DisabledVideoClipGenerationProvider returns not connected message", async () => {
  const { disabledVideoClipProvider, CLIP_GENERATION_UNAVAILABLE, videoClipStoragePath } = await import(
    "../core/video/clip/provider"
  );
  const result = await disabledVideoClipProvider.generateClip({
    prompt: "Test clip",
    durationMs: 3000,
    aspectRatio: "9:16",
    projectId: "offerhub",
    sceneId: "scene-1",
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, CLIP_GENERATION_UNAVAILABLE);
  assert.equal(disabledVideoClipProvider.isAvailable(), false);
  assert.ok(videoClipStoragePath("offerhub", "clip-1").startsWith("offerhub/video-clips/"));
});

await test("buildSuggestedClipPrompt uses script, brand, and reel style", () => {
  const { buildSuggestedClipPrompt } = require("../core/video/clip/prompt");
  const scene = blankReelDocument("offerhub", "Prompt").scenes[0]!;
  scene.script = "Trust and speed for global payments.";
  scene.visualDirection = "Golden hour city skyline.";
  const prompt = buildSuggestedClipPrompt({
    scene,
    brand: offerhub.brand,
    metadata: { style: "editorial", platform: "instagram", brief: "Offer-Hub trust reel" },
  });
  assert.ok(prompt.includes("Offer-Hub") || prompt.includes(offerhub.brand.name));
  assert.ok(prompt.includes("Trust and speed"));
  assert.ok(prompt.includes("editorial"));
  assert.ok(prompt.includes("Golden hour"));
});

await test("video clip background persists through clone and snapshot patch", () => {
  const { upsertVideoClipBackground, hasReadyVideoBackground } = require("../core/video/clip/background");
  let doc = blankReelDocument("offerhub", "Persist clip");
  const scene = doc.scenes[0]!;
  const nextScene = upsertVideoClipBackground(scene, {
    generationPrompt: "Brand b-roll",
    generationStatus: "ready",
    assetUrl: "https://storage.example.com/offerhub/video-clips/clip-1.mp4",
    assetId: "clip-1",
    provider: "disabled",
    durationMs: 4000,
  });
  doc = syncVideoDuration({ ...doc, scenes: [nextScene] });
  const cloned = cloneVideoDocument(doc);
  assert.ok(hasReadyVideoBackground(cloned.scenes[0]!));
  assert.equal(cloned.scenes[0]!.background?.videoClip?.assetId, "clip-1");
});

await test("Remotion renderer supports OffthreadVideo backgrounds", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const src = fs.readFileSync(
    path.join(process.cwd(), "core/video/remotion/VideoDocumentRenderer.tsx"),
    "utf8",
  );
  assert.ok(src.includes("OffthreadVideo"));
  assert.ok(src.includes("getVideoBackgroundSrc"));
  assert.ok(src.includes("CaptionOverlay"));
});

await test("existing blank reel scenes remain color backgrounds", () => {
  const doc = blankReelDocument("offerhub", "Legacy reel");
  assert.equal(doc.scenes[0]!.background?.type, "color");
  assert.equal(doc.scenes[0]!.background?.videoClip, undefined);
});

await test("VideoEditor exposes generate/regenerate/remove clip controls", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const editor = fs.readFileSync(path.join(process.cwd(), "core/editor/VideoEditor.tsx"), "utf8");
  const panel = fs.readFileSync(path.join(process.cwd(), "core/editor/SceneVideoClipPanel.tsx"), "utf8");
  assert.ok(editor.includes("SceneVideoClipPanel"));
  assert.ok(panel.includes("Generate video"));
  assert.ok(panel.includes("Regenerate"));
  assert.ok(panel.includes("Remove video"));
  assert.ok(panel.includes("Generation prompt"));
});

await test("static design documents unaffected by video clip types", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const designSrc = fs.readFileSync(path.join(process.cwd(), "core/design/document.ts"), "utf8");
  assert.ok(!designSrc.includes("VideoClipBackground"));
  assert.ok(!designSrc.includes("videoClip"));
});

await test("storyboard export includes scene timings and prompts", () => {
  const { storyboardToMarkdown, storyboardToJson } = require("../core/video/production/storyboard-export");
  let doc = blankReelDocument("offerhub", "Kit reel");
  doc.scenes[0]!.script = "Get paid globally.";
  doc.scenes[0]!.visualDirection = "Close-up on payment confirmation.";
  const md = storyboardToMarkdown(doc, offerhub.brand, "Offer-Hub");
  const json = storyboardToJson(doc, offerhub.brand, "Offer-Hub");
  assert.ok(md.includes("Scene 1"));
  assert.ok(md.includes("Get paid globally"));
  assert.ok(md.includes("Close-up on payment confirmation"));
  assert.equal(json.scenes[0].script, "Get paid globally.");
});

await test("production kit manifest includes voice music and sfx metadata", () => {
  const { buildReelManifest } = require("../core/video/production/manifest");
  let doc = blankReelDocument("offerhub", "Manifest reel");
  doc.voiceover = {
    assetUrl: "https://example.com/vo.mp3",
    voiceId: "v1",
    modelId: "eleven_multilingual_v2",
    durationMs: 12_000,
  };
  doc.music = {
    assetUrl: "https://example.com/music.mp3",
    volume: 0.35,
    prompt: "Upbeat bed",
    status: "ready",
    provider: "elevenlabs",
    durationMs: 15_000,
  };
  doc.soundEffects = [
    {
      id: "sfx-1",
      sceneId: doc.scenes[0]!.id,
      prompt: "soft digital payment confirmation",
      startMs: 0,
      durationMs: 2000,
      status: "ready",
      assetUrl: "https://example.com/sfx.mp3",
    },
  ];
  const manifest = buildReelManifest(doc, { id: "offerhub", name: "Offer-Hub" }, offerhub.brand);
  assert.equal(manifest.version, 1);
  assert.equal(manifest.voiceover.ready, true);
  assert.equal(manifest.music.ready, true);
  assert.equal(manifest.soundEffects.length, 1);
});

await test("reel audio storage paths use project-assets reel folders", async () => {
  const { reelVoiceoverPath, reelMusicPath, reelSfxPath } = await import("../core/video/audio/storage-paths");
  assert.equal(reelVoiceoverPath("offerhub", "reel-1"), "offerhub/reels/reel-1/voice/voiceover.mp3");
  assert.equal(reelMusicPath("offerhub", "reel-1"), "offerhub/reels/reel-1/music/music.mp3");
  assert.ok(reelSfxPath("offerhub", "reel-1", "sfx-a").includes("/sfx/sfx-a.mp3"));
});

await test("music and sfx metadata persists through clone", () => {
  let doc = blankReelDocument("offerhub", "Audio persist");
  doc.music = {
    assetUrl: "https://example.com/music.mp3",
    volume: 0.4,
    prompt: "Calm bed",
    status: "ready",
    provider: "elevenlabs",
    model: "music_v2",
    durationMs: 15_000,
  };
  doc.soundEffects = [
    {
      id: "sfx-1",
      sceneId: doc.scenes[0]!.id,
      prompt: "camera shutter",
      startMs: 0,
      durationMs: 1500,
      status: "ready",
      assetUrl: "https://example.com/sfx.mp3",
      provider: "elevenlabs",
    },
  ];
  const cloned = cloneVideoDocument(doc);
  assert.equal(cloned.music?.status, "ready");
  assert.equal(cloned.soundEffects?.length, 1);
  const refs = collectVideoAssetRefs(cloned);
  assert.ok(refs.some((r) => r.type === "music"));
  assert.ok(refs.some((r) => r.type === "sfx"));
});

await test("production kit UI and audio timeline components exist", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const kit = fs.readFileSync(path.join(process.cwd(), "core/editor/ProductionKitPanel.tsx"), "utf8");
  const timeline = fs.readFileSync(path.join(process.cwd(), "core/editor/ReelAudioTimeline.tsx"), "utf8");
  const music = fs.readFileSync(path.join(process.cwd(), "core/editor/ReelMusicPanel.tsx"), "utf8");
  const sfx = fs.readFileSync(path.join(process.cwd(), "core/editor/SceneSoundEffectPanel.tsx"), "utf8");
  assert.ok(kit.includes("Export production kit"));
  assert.ok(kit.includes("Export storyboard"));
  assert.ok(timeline.includes("Voice"));
  assert.ok(timeline.includes("Music"));
  assert.ok(timeline.includes("SFX"));
  assert.ok(music.includes("Generate music"));
  assert.ok(sfx.includes("Add sound effect"));
});

await test("ElevenLabs provider modules are separated from VideoEditor", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const editor = fs.readFileSync(path.join(process.cwd(), "core/editor/VideoEditor.tsx"), "utf8");
  assert.ok(!editor.includes("ElevenLabsClient"));
  assert.ok(fs.existsSync(path.join(process.cwd(), "core/video/audio/elevenlabs-tts-provider.ts")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "core/video/audio/elevenlabs-music-provider.ts")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "core/video/audio/elevenlabs-sfx-provider.ts")));
});

await test("JSONB sanitization removes U+0000 and preserves normal Unicode", async () => {
  const {
    assertJsonbSerializable,
    findInvalidJsonbStringPaths,
    sanitizeSnapshotForJsonb,
  } = await import("../core/repositories/jsonb-sanitize");

  const MANUAL_SCRIPT =
    "Global work shouldn't mean payment friction. Offer-Hub connects businesses and freelancers to communicate, track progress, and pay securely. Work globally with Offer-Hub.";

  const dirtyPersist = {
    version: 2,
    userProjects: [],
    overlays: {
      offerhub: {
        posts: {
          patches: {
            "reel-jsonb-test": {
              video: {
                script: `café résumé — emoji 🎬${"\u0000"}tail`,
                voiceoverScriptOverride: `${MANUAL_SCRIPT}\u0000`,
                voiceover: {
                  assetUrl: "https://example.com/vo.mp3",
                  voiceId: "v1",
                  modelId: "eleven_multilingual_v2",
                  script: MANUAL_SCRIPT,
                  costMetadata: { note: `metadata\u0000` },
                },
                music: {
                  prompt: `Instrumental bed — Stellar\u0000`,
                  status: "failed",
                  volume: 0.35,
                },
                soundEffects: [
                  {
                    id: "sfx-1",
                    sceneId: "scene-1",
                    prompt: `whoosh\u0000`,
                    startMs: 0,
                    durationMs: 2000,
                    status: "ready",
                    assetUrl: "https://example.com/sfx.mp3",
                  },
                ],
              },
            },
          },
        },
      },
    },
    ops: emptyOpsPersist(),
  };

  const invalid = findInvalidJsonbStringPaths(dirtyPersist);
  assert.ok(invalid.some((item) => item.path.includes("voiceoverScriptOverride")));
  assert.ok(invalid.some((item) => item.path.includes("music.prompt")));

  const clean = sanitizeSnapshotForJsonb(dirtyPersist);
  assert.ok(!JSON.stringify(clean).includes("\\u0000"));
  assertJsonbSerializable(clean);

  const video = (clean as typeof dirtyPersist).overlays.offerhub.posts.patches["reel-jsonb-test"].video;
  assert.ok(video.script.includes("café résumé"));
  assert.ok(video.script.includes("🎬"));
  assert.ok(video.script.includes("—"));
  assert.ok(!video.script.includes("\u0000"));
  assert.equal(video.voiceoverScriptOverride, MANUAL_SCRIPT);
  assert.equal(video.voiceover.script, MANUAL_SCRIPT);
  assert.ok(!video.music.prompt.includes("\u0000"));
  assert.equal(video.soundEffects[0].prompt, "whoosh");

  const { buildProductionKitSummary } = require("../core/video/production/manifest");
  const { buildReelManifest } = require("../core/video/production/manifest");
  const doc = applyScriptToDocument(
    setVoiceoverManualOverride(blankReelDocument("offerhub", "Kit"), MANUAL_SCRIPT),
  );
  assert.ok(buildProductionKitSummary(doc));
  assert.ok(buildReelManifest(doc, { id: "offerhub", name: "Offer-Hub" }, offerhub.brand));
});

if (process.env.ANTHROPIC_API_KEY) {
  await test("[live] Claude storyboard generation", async () => {
    const { generateStoryboardWithProvider } = await import("../core/video/generation/claude-errors");
    const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
    const ctx = getProjectCreativeContext(offerhub, ops);
    const result = await generateStoryboardWithProvider({
      providerKind: "claude",
      brief: {
        brief: "30-second pitch: Offer-Hub helps freelancers get paid globally with trust",
        platform: "instagram",
        format: "reel",
        style: "editorial",
        durationMs: 15_000,
        creativeFreedom: "medium",
        generateCaptions: true,
        title: "Claude Audit Reel",
      },
      context: ctx,
      genOptions: { assetBaseUrl: process.env.AUDIT_BASE_URL ?? "http://localhost:3000" },
    });
    if (result.fallbackFromClaude) {
      console.log("  (Claude credits unavailable — dev mock fallback used)");
      assert.equal(result.provider, "mock");
    } else {
      assert.equal(result.provider, "claude");
    }
    assert.equal(result.video.title, "Claude Audit Reel");
    assert.ok(result.video.scenes.length >= 4 && result.video.scenes.length <= 6);
    assert.ok(result.video.scenes.every((s) => s.elements.length > 0));
  });
} else {
  console.log("○ [live] Claude storyboard test skipped (ANTHROPIC_API_KEY not set)");
}

if (process.env.ELEVENLABS_API_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  await test("[live] ElevenLabs voiceover generation", async () => {
    const base = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
    const voicesRes = await fetch(`${base}/api/audio/voices`);
    const voicesData = (await voicesRes.json()) as { voices?: { voiceId: string }[]; errorMessage?: string };
    if (!voicesRes.ok || !voicesData.voices?.length) {
      console.log("  (skipped — voices unavailable, is dev server running?)");
      return;
    }
    const genRes = await fetch(`${base}/api/audio/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "This is a short Offer-Hub test voiceover.",
        voiceId: voicesData.voices[0]!.voiceId,
        projectId: "offerhub",
        assetId: `audit-vo-${Date.now()}`,
      }),
    });
    const genData = (await genRes.json()) as { assetUrl?: string; durationMs?: number; error?: string };
    assert.ok(genRes.ok, genData.error ?? "generate failed");
    assert.ok(genData.assetUrl?.includes("http"));
    assert.ok(genData.durationMs && genData.durationMs > 0);
  });
} else {
  console.log("○ [live] ElevenLabs test skipped (ELEVENLABS_API_KEY or Supabase not set)");
}

if (process.env.AUDIT_VIDEO_RENDER === "1" && canRenderOnPlatform()) {
  await test("[live] Local MP4 render", async () => {
    const doc = blankReelDocument("offerhub", "Render test", 3000);
    const { localVideoRenderProvider } = await import("../core/video/render/local-provider");
    const result = await localVideoRenderProvider.renderMp4(doc, "offerhub", `audit-${Date.now()}`);
    if (!result.ok && result.errorMessage?.includes("WebSocket")) {
      console.log("  (skipped — Node.js 22+ required for Remotion render on this machine)");
      return;
    }
    assert.ok(result.ok, result.errorMessage ?? "render failed");
    assert.ok(result.publicUrl?.includes("http"));
  });
} else {
  console.log("○ [live] MP4 render skipped (set AUDIT_VIDEO_RENDER=1 and VIDEO_RENDER_ENABLED=true)");
}

const failed = results.filter((r) => !r.ok);
console.log("\n--- Video audit summary ---");
console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
if (failed.length) {
  console.log("Failed:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
} else {
  console.log("All video audit checks passed.");
}
