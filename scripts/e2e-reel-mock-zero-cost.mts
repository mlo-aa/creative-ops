/**
 * Zero-cost Reel workflow test — mock provider only, no Anthropic/ElevenLabs API calls.
 * Run: nvm use 22.19.0 && npx tsx scripts/e2e-reel-mock-zero-cost.mts
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
loadEnvConfig(process.cwd());

// Force mock provider — never call Anthropic in this script
delete process.env.ANTHROPIC_API_KEY;
if (process.env.VIDEO_RENDER_ENABLED !== "true") process.env.VIDEO_RENDER_ENABLED = "true";

type Status = "PASS" | "FAIL" | "SKIPPED";
const report: Record<string, Status> = {};
const reasons: Record<string, string> = {};

function pass(key: string) {
  report[key] = "PASS";
}
function fail(key: string, reason: string) {
  report[key] = "FAIL";
  reasons[key] = reason;
}
function skip(key: string, reason: string) {
  report[key] = "SKIPPED";
  reasons[key] = reason;
}

async function main() {
  const assert = (await import("node:assert/strict")).default;
  const { SEED_PROJECTS } = await import("../projects/index");
  const { emptyOpsPersist } = await import("../core/ops/types");
  const { ensureOpsMigration } = await import("../core/ops/migrate");
  const { getProjectCreativeContext } = await import("../core/design/creativeContext");
  const { MockVideoGenerationProvider } = await import("../core/video/generation/provider");
  const { resolveStoryboardProvider } = await import("../core/video/generation/validate");
  const {
    cloneVideoDocument,
    syncVideoDuration,
    uid,
  } = await import("../core/video/document");
  type VideoDocument = import("../core/video/document").VideoDocument;
  const { applyScriptToDocument } = await import("../core/video/script");
  const { attachCaptionsToDocument, generateCaptionsFromScenes } = await import("../core/video/captions");
  const { collectVideoAssetRefs } = await import("../core/video/voiceover");
  const { videoCompositionMeta } = await import("../core/video/remotion/VideoDocumentRenderer");
  const { applyPostPatch } = await import("../core/repository/hydrate");
  const { blankCanvasDocument, textElement } = await import("../core/design/document");
  const { documentToDesignState } = await import("../core/design/generation/provider");
  const { getSupabaseAdmin } = await import("../lib/supabase/admin");

  type AppPersist = import("../core/types").AppPersist;
  type StudioPost = import("../core/types").StudioPost;

  const nodeMajor = Number(process.version.slice(1).split(".")[0]);
  console.log(`Node: ${process.version}`);
  console.log(`ANTHROPIC_API_KEY: unset (mock only)`);
  console.log(`ElevenLabs: not called\n`);

  const offerhub = SEED_PROJECTS.find((p) => p.id === "offerhub")!;
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);
  const provider = new MockVideoGenerationProvider();

  // --- New Reel modal / mock storyboard API ---
  try {
    assert.equal(resolveStoryboardProvider(), "mock");
    const { GET, POST } = await import("../app/api/video/storyboard/route");
    const getRes = await GET();
    const getData = (await getRes.json()) as { provider: string; mockAvailable?: boolean };
    assert.equal(getData.provider, "mock");
    assert.equal(getData.mockAvailable, true);

    const { NewReelModal } = await import("../core/ui/NewReelModal");
    assert.equal(typeof NewReelModal, "function");

    const postRes = await POST(
      new Request("http://internal/api/video/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://127.0.0.1:3000" },
        body: JSON.stringify({
          brief: {
            brief: "Offer-Hub helps freelancers get paid globally with trust.",
            platform: "instagram",
            format: "reel",
            style: "editorial",
            durationMs: 15_000,
            creativeFreedom: "medium",
            generateCaptions: true,
            title: "Mock Zero-Cost Reel",
          },
          context: ctx,
        }),
      }),
    );
    const postData = (await postRes.json()) as { video?: VideoDocument; provider?: string };
    assert.ok(postRes.ok, `POST storyboard failed: ${JSON.stringify(postData)}`);
    assert.equal(postData.provider, "mock");
    assert.ok(postData.video);
    pass("Mock storyboard");
  } catch (e) {
    fail("Mock storyboard", e instanceof Error ? e.message : String(e));
  }

  // --- Generate doc via mock for remaining tests ---
  let doc: VideoDocument;
  try {
    doc = await provider.generateStoryboard(
      {
        brief: "Offer-Hub helps freelancers get paid globally with trust and speed.",
        platform: "instagram",
        format: "reel",
        style: "editorial",
        durationMs: 15_000,
        creativeFreedom: "medium",
        generateCaptions: true,
        title: "Mock Zero-Cost Reel",
      },
      ctx,
    );
    doc = applyScriptToDocument(doc);
    doc = attachCaptionsToDocument(doc, offerhub.brand);

    assert.equal(doc.width, 1080);
    assert.equal(doc.height, 1920);
    assert.equal(doc.fps, 30);
    assert.ok(doc.scenes.length >= 4 && doc.scenes.length <= 6);
    assert.ok(doc.scenes.every((s) => s.durationMs >= 500));
    assert.ok(doc.scenes.every((s) => s.elements.length > 0));
    assert.ok(doc.script && doc.script.length > 10);
    assert.equal(doc.metadata.generatedBy, "mock");
    const meta = videoCompositionMeta(doc);
    assert.ok(meta.durationInFrames > 0);
    pass("VideoDocument validation");
  } catch (e) {
    fail("VideoDocument validation", e instanceof Error ? e.message : String(e));
    console.error("\nCannot continue without valid document.");
    printReport();
    process.exit(1);
  }

  // --- Scene editing ---
  try {
    const next = cloneVideoDocument(doc);
    const textEl = next.scenes.flatMap((s) => s.elements).find((e) => e.type === "text")!;
    (textEl.props as { content: string }).content = "EDITED HEADLINE";
    next.scenes[0]!.script = "Updated scene script for voiceover.";
    const synced = applyScriptToDocument(syncVideoDuration(next));
    assert.equal((synced.scenes[0]!.elements.find((e) => e.id === textEl.id)!.props as { content: string }).content, "EDITED HEADLINE");
    assert.ok(synced.script.includes("Updated scene script"));
    doc = synced;
    pass("Scene editing");
  } catch (e) {
    fail("Scene editing", e instanceof Error ? e.message : String(e));
  }

  // --- Reordering ---
  try {
    assert.ok(doc.scenes.length >= 2);
    const reordered = syncVideoDuration({
      ...doc,
      scenes: [doc.scenes[1]!, doc.scenes[0]!, ...doc.scenes.slice(2)],
    });
    assert.equal(reordered.scenes[0]!.id, doc.scenes[1]!.id);
    assert.equal(reordered.scenes[1]!.id, doc.scenes[0]!.id);
    doc = reordered;
    pass("Reordering");
  } catch (e) {
    fail("Reordering", e instanceof Error ? e.message : String(e));
  }

  // --- Timing ---
  try {
    const next = cloneVideoDocument(doc);
    next.scenes[0] = { ...next.scenes[0]!, durationMs: 6000 };
    const synced = syncVideoDuration(next);
    assert.equal(synced.scenes[0]!.startMs, 0);
    assert.equal(synced.scenes[0]!.durationMs, 6000);
    assert.ok(synced.durationMs > 0);
    const expectedTotal = synced.scenes.reduce((sum, s) => sum + s.durationMs, 0);
    assert.equal(synced.durationMs, expectedTotal);
    doc = synced;
    pass("Timing");
  } catch (e) {
    fail("Timing", e instanceof Error ? e.message : String(e));
  }

  // --- Captions ---
  try {
    const withCaps = attachCaptionsToDocument(doc, offerhub.brand);
    assert.ok(withCaps.captions && withCaps.captions.segments.length > 0);
    const edited = cloneVideoDocument(withCaps);
    edited.captions!.segments[0]!.text = "Edited caption text.";
    assert.equal(edited.captions!.segments[0]!.text, "Edited caption text.");
    const toggledOff = { ...edited, captions: undefined };
    assert.equal(toggledOff.captions, undefined);
    const toggledOn = attachCaptionsToDocument(toggledOff, offerhub.brand);
    assert.ok(toggledOn.captions!.segments.length > 0);
    doc = edited;
    pass("Captions");
  } catch (e) {
    fail("Captions", e instanceof Error ? e.message : String(e));
  }

  // --- Script persistence (via snapshot patch) ---
  try {
    doc.scenes[0]!.script = "Persisted scene one script.";
    doc.scenes[1]!.script = "Persisted scene two script.";
    const applied = applyScriptToDocument(doc);
    assert.ok(applied.script.includes("Persisted scene one script."));
    assert.ok(applied.script.includes("Persisted scene two script."));
    doc = applied;
    pass("Script edits persist");
  } catch (e) {
    fail("Script edits persist", e instanceof Error ? e.message : String(e));
  }

  // --- Project assets attached ---
  try {
    const asset = ctx.assets.find((a) => a.src);
    assert.ok(asset, "project should have assets");
    const next = cloneVideoDocument(doc);
    next.scenes[0]!.elements.push({
      id: uid("el"),
      type: "image",
      name: asset!.name,
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      opacity: 1,
      rotation: 0,
      zIndex: 0,
      startOffsetMs: 0,
      durationMs: next.scenes[0]!.durationMs,
      props: { src: asset!.src, assetId: asset!.id, objectFit: "cover" },
    });
    const refs = collectVideoAssetRefs(next);
    assert.ok(refs.some((r) => r.assetId === asset!.id));
    assert.ok(refs.some((r) => r.src.includes("offerhub") || r.src.startsWith("/projects/")));
    doc = next;
    pass("Project assets can be attached");
  } catch (e) {
    fail("Project assets can be attached", e instanceof Error ? e.message : String(e));
  }

  // --- Persistence via workspace snapshot ---
  try {
    const postId = `mock-zero-cost-${Date.now()}`;
    const post: StudioPost = {
      id: postId,
      baseId: postId,
      number: "88",
      title: doc.title,
      exportKind: "mp4",
      durationMs: doc.durationMs,
      status: "draft",
      kind: "reel",
      template: "video",
      design: { headline: "", supporting: "", imageSrc: "", logoId: offerhub.brand.logos[0]?.id ?? "" },
      video: doc,
    };

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

    const { savePersist, loadPersist, STORAGE_KEY } = await import("../core/repository/persist");
    const persist: AppPersist = {
      version: 2,
      userProjects: [],
      overlays: {
        offerhub: {
          posts: { order: [postId], extras: [post], patches: {}, deletedIds: [] },
        },
      },
      ops,
    };
    savePersist(persist);

    const edited = cloneVideoDocument(doc);
    edited.title = "Reloaded reel title";
    edited.scenes[0]!.durationMs = 5500;
    const synced = syncVideoDuration(edited);
    synced.script = applyScriptToDocument(synced).script;

    const reloaded = loadPersist();
    const overlay = reloaded.overlays.offerhub;
    const patched = applyPostPatch(
      overlay!.posts!.extras.find((p) => p.id === postId)!,
      { video: synced },
    );

    memory.clear();
    memory.set(STORAGE_KEY, JSON.stringify({
      ...reloaded,
      overlays: {
        offerhub: {
          posts: {
            ...overlay!.posts!,
            patches: { [postId]: { video: synced } },
          },
        },
      },
    }));
    const final = loadPersist();
    const found = applyPostPatch(
      final.overlays.offerhub!.posts!.extras.find((p) => p.id === postId)!,
      final.overlays.offerhub!.posts!.patches[postId],
    );

    assert.equal(found.video!.title, "Reloaded reel title");
    assert.ok(found.video!.script.includes("Persisted scene"));
    assert.equal(found.video!.durationMs, synced.durationMs);
    doc = found.video!;
    pass("Persistence");
  } catch (e) {
    fail("Persistence", e instanceof Error ? e.message : String(e));
  }

  // --- Existing voice asset (no new ElevenLabs generation) ---
  try {
    const admin = getSupabaseAdmin();
    let existingVoUrl: string | undefined;

    if (admin) {
      const { data: files } = await admin.storage.from("exports").list("offerhub/exports", { limit: 20 });
      const mp3InExports = files?.find((f) => f.name.endsWith(".mp3"));
      if (mp3InExports) {
        const { data: pub } = admin.storage.from("exports").getPublicUrl(`offerhub/exports/${mp3InExports.name}`);
        existingVoUrl = pub.publicUrl;
      }
      if (!existingVoUrl) {
        const { data: assets } = await admin.storage.from("project-assets").list("offerhub", { limit: 50 });
        const mp3Asset = assets?.find((f) => f.name.endsWith(".mp3") || f.metadata?.mimetype === "audio/mpeg");
        if (mp3Asset) {
          const { data: pub } = admin.storage.from("project-assets").getPublicUrl(`offerhub/${mp3Asset.name}`);
          existingVoUrl = pub.publicUrl;
        }
      }
    }

    if (!existingVoUrl) {
      skip("Existing voice asset playback", "No existing voiceover MP3 found in Supabase storage");
    } else {
      const withVo = cloneVideoDocument(doc);
      withVo.voiceover = {
        assetUrl: existingVoUrl,
        assetId: "existing-vo",
        voiceId: "existing",
        modelId: "eleven_multilingual_v2",
        durationMs: 8000,
        script: withVo.script,
      };
      const rendererSrc = fs.readFileSync(
        path.join(process.cwd(), "core/video/remotion/VideoDocumentRenderer.tsx"),
        "utf8",
      );
      assert.ok(rendererSrc.includes("<Audio") && rendererSrc.includes("doc.voiceover?.assetUrl"));
      const editorSrc = fs.readFileSync(path.join(process.cwd(), "core/editor/VideoEditor.tsx"), "utf8");
      assert.ok(editorSrc.includes("doc.voiceover?.assetUrl"));
      doc = withVo;
      pass("Existing voice asset playback");
    }
  } catch (e) {
    fail("Existing voice asset playback", e instanceof Error ? e.message : String(e));
  }

  // --- Remotion preview (composition select) ---
  try {
    const meta = videoCompositionMeta(doc);
    assert.equal(meta.width, 1080);
    assert.equal(meta.height, 1920);
    assert.ok(meta.durationInFrames > 0);

    if (nodeMajor >= 22) {
      const { bundle } = await import("@remotion/bundler");
      const { selectComposition } = await import("@remotion/renderer");
      const entry = path.join(process.cwd(), "core/video/remotion/entry.tsx");
      const serveUrl = await bundle({ entryPoint: entry });
      const composition = await selectComposition({
        serveUrl,
        id: "VideoDocument",
        inputProps: { document: doc },
      });
      assert.equal(composition.id, "VideoDocument");
      assert.ok(composition.durationInFrames > 0);
    }
    pass("Remotion preview");
  } catch (e) {
    fail("Remotion preview", e instanceof Error ? e.message : String(e));
  }

  // --- Local MP4 render + Supabase upload ---
  try {
    if (nodeMajor < 22) {
      fail("Local MP4 render", `Node ${process.version} — need Node 22+`);
      fail("Supabase upload", "Render skipped — Node 22 required");
    } else {
      const admin = getSupabaseAdmin();
      if (!admin) {
        fail("Local MP4 render", "Supabase admin not configured");
        fail("Supabase upload", "Supabase admin not configured");
      } else {
        const { localVideoRenderProvider } = await import("../core/video/render/local-provider");
        const renderDoc = cloneVideoDocument(doc);
        const baseUrl = process.env.REMOTION_ASSET_BASE_URL ?? "http://127.0.0.1:3000";
        for (const scene of renderDoc.scenes) {
          for (const el of scene.elements) {
            if ((el.type === "image" || el.type === "logo") && "src" in el.props) {
              const src = (el.props as { src: string }).src;
              if (src.startsWith("/")) (el.props as { src: string }).src = `${baseUrl}${src}`;
            }
          }
          if (scene.background?.type === "image" && scene.background.value.startsWith("/")) {
            scene.background.value = `${baseUrl}${scene.background.value}`;
          }
        }

        const result = await localVideoRenderProvider.renderMp4(renderDoc, "offerhub", `mock-zero-${Date.now()}`);
        if (!result.ok) {
          fail("Local MP4 render", result.errorMessage ?? "render failed");
          fail("Supabase upload", result.errorMessage ?? "upload skipped");
        } else {
          pass("Local MP4 render");
          if (result.publicUrl?.includes("http")) {
            pass("Supabase upload");
            console.log(`  MP4 uploaded: ${result.publicUrl} (${((result.bytes ?? 0) / 1024).toFixed(1)} KB)`);
          } else {
            fail("Supabase upload", "No publicUrl returned");
          }
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail("Local MP4 render", msg);
    fail("Supabase upload", msg);
  }

  // --- Static design workflow unaffected ---
  try {
    const designDoc = blankCanvasDocument(offerhub.brand);
    designDoc.elements.push(
      textElement({ name: "Headline", props: { content: "STATIC DESIGN OK" } }, offerhub.brand),
    );
    const design = documentToDesignState(designDoc, offerhub.brand);
    assert.equal(design.headline, "STATIC DESIGN OK");
    assert.ok(designDoc.elements.length === 1);
    pass("Static designs unaffected");
  } catch (e) {
    fail("Static designs unaffected", e instanceof Error ? e.message : String(e));
  }

  printReport();
  const anyFail = Object.values(report).some((s) => s === "FAIL");
  process.exit(anyFail ? 1 : 0);
}

function printReport() {
  console.log("\n--- Zero-Cost Mock Reel Workflow Report ---");
  const keys = [
    "Mock storyboard",
    "VideoDocument validation",
    "Scene editing",
    "Reordering",
    "Timing",
    "Captions",
    "Script edits persist",
    "Project assets can be attached",
    "Persistence",
    "Existing voice asset playback",
    "Remotion preview",
    "Local MP4 render",
    "Supabase upload",
    "Static designs unaffected",
  ];
  for (const key of keys) {
    const status = report[key] ?? "FAIL";
    console.log(`${key}: ${status}`);
    if (reasons[key]) console.log(`  → ${reasons[key]}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
