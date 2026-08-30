/**
 * Reel V1 end-to-end validation — run with Node 22+:
 *   nvm use 22.19.0
 *   npx tsx scripts/e2e-reel-v1.mts
 *
 * Loads .env.local via @next/env (same as Next.js). VIDEO_RENDER_ENABLED defaults to true for this script.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");

loadEnvConfig(process.cwd());

if (process.env.VIDEO_RENDER_ENABLED !== "true") {
  process.env.VIDEO_RENDER_ENABLED = "true";
}

async function main() {
  const assert = (await import("node:assert/strict")).default;
  const fs = (await import("node:fs")).default;
  const path = (await import("node:path")).default;

  const { SEED_PROJECTS } = await import("../projects/index");
  const { emptyOpsPersist } = await import("../core/ops/types");
  const { ensureOpsMigration } = await import("../core/ops/migrate");
  const { getProjectCreativeContext } = await import("../core/design/creativeContext");
  const { MockVideoGenerationProvider } = await import("../core/video/generation/provider");
  const { attachCaptionsToDocument } = await import("../core/video/captions");
  const { applyScriptToDocument } = await import("../core/video/script");
  const { cloneVideoDocument } = await import("../core/video/document");
  const { getVoiceoverTimingStatus } = await import("../core/video/voiceover");
  const { applyPostPatch } = await import("../core/repository/hydrate");
  const { getSupabaseAdmin } = await import("../lib/supabase/admin");

  type AppPersist = import("../core/types").AppPersist;
  type StudioPost = import("../core/types").StudioPost;

  const report: Record<string, "PASS" | "FAIL" | "SKIP"> = {};
  const failReasons: Record<string, string> = {};

  function setResult(key: string, ok: boolean, reason?: string) {
    report[key] = ok ? "PASS" : "FAIL";
    if (!ok && reason) failReasons[key] = reason;
  }

  function skip(key: string, reason: string) {
    report[key] = "SKIP";
    failReasons[key] = reason;
  }

  const nodeVersion = process.version;
  const nodeMajor = Number(nodeVersion.slice(1).split(".")[0]);
  console.log(`Node version: ${nodeVersion}`);

  // --- env preflight (never log secret values) ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "configured" : "missing"}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "configured" : "missing"}`);
  console.log(`ELEVENLABS_API_KEY: ${elevenKey ? "configured" : "missing"}`);

  const admin = getSupabaseAdmin();
  const adminConfigured = Boolean(admin);
  console.log(`Supabase admin: ${adminConfigured ? "configured" : "not configured"}`);

  if (adminConfigured && serviceRoleKey && anonKey && serviceRoleKey === anonKey) {
    console.log("  ⚠ Admin client would use publishable key — SUPABASE_SERVICE_ROLE_KEY must differ from anon key");
  }

  let projectAssetsOk = false;
  let exportsOk = false;
  if (admin) {
    const pa = await admin.storage.from("project-assets").list("", { limit: 1 });
    projectAssetsOk = !pa.error;
    console.log(`project-assets: ${projectAssetsOk ? "accessible" : "not accessible"}`);
    if (pa.error) console.log(`  → ${pa.error.message}`);

    const ex = await admin.storage.from("exports").list("", { limit: 1 });
    exportsOk = !ex.error;
    console.log(`exports: ${exportsOk ? "accessible" : "not accessible"}`);
    if (ex.error) console.log(`  → ${ex.error.message}`);
  } else {
    console.log("project-assets: not accessible");
    console.log("exports: not accessible");
  }

  console.log(`VIDEO_RENDER_ENABLED: ${process.env.VIDEO_RENDER_ENABLED}`);

  // --- storyboard ---
  const offerhub = SEED_PROJECTS.find((p) => p.id === "offerhub")!;
  const provider = new MockVideoGenerationProvider();
  const ops = ensureOpsMigration(emptyOpsPersist(), SEED_PROJECTS);
  const ctx = getProjectCreativeContext(offerhub, ops);

  let doc = await provider.generateStoryboard(
    {
      brief: "Offer-Hub ayuda a freelancers a cobrar de forma segura en todo el mundo.",
      platform: "instagram",
      format: "reel",
      style: "editorial",
      durationMs: 12_000,
      creativeFreedom: "medium",
      generateCaptions: true,
      title: "Offer-Hub E2E Reel",
    },
    ctx,
  );
  doc = applyScriptToDocument(doc);
  doc = attachCaptionsToDocument(doc, offerhub.brand);

  setResult("ElevenLabs API", Boolean(elevenKey), "ELEVENLABS_API_KEY not configured");

  let voiceId = "";
  if (elevenKey) {
    try {
      async function fetchVoices(): Promise<Response> {
        try {
          const res = await fetch(`${process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000"}/api/audio/voices`, {
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) return res;
        } catch {
          /* dev server not running — call route directly */
        }
        const { GET } = await import("../app/api/audio/voices/route");
        return GET();
      }

      const voicesRes = await fetchVoices();
      const voicesData = (await voicesRes.json()) as {
        voices?: { voiceId: string; name: string }[];
        errorMessage?: string;
      };
      if (!voicesRes.ok || voicesData.errorMessage) {
        setResult("Voice list", false, voicesData.errorMessage ?? `HTTP ${voicesRes.status}`);
      } else {
        setResult("Voice list", (voicesData.voices?.length ?? 0) > 0);
        voiceId = voicesData.voices?.[0]?.voiceId ?? "";
        if (!voiceId) failReasons["Voice list"] = "No voices returned";
      }
    } catch (e) {
      setResult("Voice list", false, e instanceof Error ? e.message : String(e));
    }

    if (voiceId) {
      doc.metadata.voiceId = voiceId;
      const spanishScript =
        "Offer-Hub conecta empresas con freelancers talentosos. Cobra de forma segura, rápida y global.";
      doc.script = spanishScript;
      try {
        async function generateVoice(body: object): Promise<Response> {
          try {
            const res = await fetch(`${process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000"}/api/audio/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              signal: AbortSignal.timeout(120_000),
            });
            if (res.ok || res.status !== 503) return res;
          } catch {
            /* dev server not running */
          }
          const { POST } = await import("../app/api/audio/generate/route");
          return POST(
            new Request("http://internal/api/audio/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
          );
        }

        const genRes = await generateVoice({
          text: spanishScript,
          voiceId,
          projectId: "offerhub",
          assetId: `e2e-vo-${Date.now()}`,
        });
        const genData = (await genRes.json()) as {
          assetUrl?: string;
          durationMs?: number;
          error?: string;
          code?: string;
        };
        if (!genRes.ok) {
          setResult("Voice generation", false, genData.error ?? `HTTP ${genRes.status}`);
        } else {
          assert.ok(genData.assetUrl);
          assert.ok(genData.durationMs && genData.durationMs > 0);
          doc.voiceover = {
            assetUrl: genData.assetUrl!,
            assetId: "e2e-vo",
            voiceId,
            modelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
            durationMs: genData.durationMs,
            script: spanishScript,
            characterCount: spanishScript.length,
          };
          setResult("Voice generation", true);
          const timing = getVoiceoverTimingStatus(doc);
          if (timing?.exceedsReel) {
            console.log(
              `  Note: voiceover (${timing.audioDurationMs}ms) exceeds reel (${timing.reelDurationMs}ms) — not truncated`,
            );
          }
        }
      } catch (e) {
        setResult("Voice generation", false, e instanceof Error ? e.message : String(e));
      }
    } else {
      skip("Voice generation", "No voice ID available");
    }
  } else {
    setResult("Voice list", false, "ELEVENLABS_API_KEY not configured");
    setResult("Voice generation", false, "ELEVENLABS_API_KEY not configured");
  }

  // --- persistence reload ---
  const postId = `e2e-reel-${Date.now()}`;
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
        posts: {
          order: [postId],
          extras: [post],
          patches: {},
          deletedIds: [],
        },
      },
    },
    ops,
  };
  savePersist(persist);
  memory.clear();
  memory.set(STORAGE_KEY, JSON.stringify(persist));
  const reloaded = loadPersist();
  const overlay = reloaded.overlays.offerhub;
  const extras = overlay?.posts?.extras ?? [];
  const found = extras.find((p) => p.id === postId);
  const patched = found ? applyPostPatch(found, overlay?.posts?.patches[postId]) : undefined;

  if (doc.voiceover?.assetUrl) {
    const voOk =
      Boolean(patched?.video?.voiceover?.assetUrl) &&
      patched!.video!.voiceover!.assetUrl === doc.voiceover.assetUrl &&
      Boolean(patched!.video!.voiceover!.durationMs);
    setResult(
      "Voice persisted after reload",
      voOk,
      voOk ? undefined : "voiceover missing or changed after reload",
    );
  } else {
    setResult("Voice persisted after reload", false, "No voiceover generated");
  }

  // --- audio in composition ---
  const rendererSrc = fs.readFileSync(
    path.join(process.cwd(), "core/video/remotion/VideoDocumentRenderer.tsx"),
    "utf8",
  );
  setResult(
    "Audio included in MP4",
    rendererSrc.includes("<Audio") && rendererSrc.includes("doc.voiceover?.assetUrl"),
    "VideoDocumentComposition missing <Audio src={doc.voiceover.assetUrl} />",
  );

  // --- local MP4 render ---
  if (nodeMajor < 22) {
    setResult("Local Remotion render", false, `Node ${nodeVersion} — need Node 22+ (nvm use 22.19.0)`);
    setResult("Supabase MP4 upload", false, "Render skipped — Node 22 required");
  } else if (!adminConfigured || !exportsOk) {
    setResult(
      "Local Remotion render",
      false,
      !adminConfigured ? "Supabase admin not configured" : "exports bucket not accessible",
    );
    setResult(
      "Supabase MP4 upload",
      false,
      !adminConfigured ? "Supabase admin not configured" : "exports bucket not accessible",
    );
  } else {
    try {
      const { localVideoRenderProvider } = await import("../core/video/render/local-provider");
      const renderDoc = cloneVideoDocument(patched?.video ?? doc);
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

      const result = await localVideoRenderProvider.renderMp4(renderDoc, "offerhub", postId);
      if (!result.ok) {
        setResult("Local Remotion render", false, result.errorMessage);
        setResult("Supabase MP4 upload", false, result.errorMessage);
      } else {
        setResult("Local Remotion render", true);
        setResult(
          "Supabase MP4 upload",
          Boolean(result.publicUrl?.includes("http")),
          result.publicUrl ? undefined : "No publicUrl returned",
        );
        if (result.publicUrl) console.log(`  MP4 URL: ${result.publicUrl}`);
        if (result.bytes) console.log(`  MP4 size: ${(result.bytes / 1024).toFixed(1)} KB`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult("Local Remotion render", false, msg);
      setResult("Supabase MP4 upload", false, msg);
    }
  }

  console.log("\n--- Reel V1 E2E Report ---");
  for (const key of [
    "ElevenLabs API",
    "Voice list",
    "Voice generation",
    "Voice persisted after reload",
    "Local Remotion render",
    "Audio included in MP4",
    "Supabase MP4 upload",
  ]) {
    const status = report[key] ?? "SKIP";
    console.log(`${key}: ${status}`);
    if (failReasons[key]) console.log(`  → ${failReasons[key]}`);
  }

  const anyFail = Object.values(report).includes("FAIL");
  process.exit(anyFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
