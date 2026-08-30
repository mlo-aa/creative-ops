import type { BrandProfile } from "@/core/types";
import type { VideoDocument } from "@/core/video/document";
import { hasReadyVideoBackground } from "@/core/video/clip/background";
import { collectVideoAssetRefs } from "@/core/video/voiceover";
import { buildStoryboardExport } from "@/core/video/production/storyboard-export";

export type ReelManifest = {
  version: 1;
  exportedAt: string;
  project: { id: string; name: string };
  reel: {
    id: string;
    title: string;
    aspectRatio: string;
    width: number;
    height: number;
    fps: number;
    totalDurationMs: number;
  };
  storyboard: ReturnType<typeof buildStoryboardExport>;
  voiceover: {
    ready: boolean;
    assetUrl?: string;
    assetId?: string;
    voiceId?: string;
    modelId?: string;
    durationMs?: number;
    script?: string;
  };
  music: {
    ready: boolean;
    assetUrl?: string;
    assetId?: string;
    prompt?: string;
    durationMs?: number;
    provider?: string;
    model?: string;
    status?: string;
  };
  soundEffects: Array<{
    id: string;
    sceneId: string;
    sceneNumber: number;
    prompt: string;
    startMs: number;
    durationMs: number;
    assetUrl?: string;
    status: string;
  }>;
  videoClips: Array<{
    sceneId: string;
    sceneNumber: number;
    assetUrl?: string;
    generationPrompt?: string;
    status?: string;
  }>;
  assets: ReturnType<typeof collectVideoAssetRefs>;
};

export function buildReelManifest(
  doc: VideoDocument,
  project: { id: string; name: string },
  brand: BrandProfile,
): ReelManifest {
  const storyboard = buildStoryboardExport(doc, brand);
  return buildReelManifestWithBrand(doc, project, storyboard);
}

export function buildReelManifestWithBrand(
  doc: VideoDocument,
  project: { id: string; name: string },
  storyboard: ReturnType<typeof buildStoryboardExport>,
): ReelManifest {
  const board = storyboard;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    project: { id: project.id, name: project.name },
    reel: {
      id: doc.id,
      title: doc.title,
      aspectRatio: "9:16",
      width: doc.width,
      height: doc.height,
      fps: doc.fps,
      totalDurationMs: doc.durationMs,
    },
    storyboard: board,
    voiceover: {
      ready: Boolean(doc.voiceover?.assetUrl),
      assetUrl: doc.voiceover?.assetUrl,
      assetId: doc.voiceover?.assetId,
      voiceId: doc.voiceover?.voiceId,
      modelId: doc.voiceover?.modelId,
      durationMs: doc.voiceover?.durationMs,
      script: doc.voiceover?.script ?? doc.script,
    },
    music: {
      ready: doc.music?.status === "ready" && Boolean(doc.music.assetUrl),
      assetUrl: doc.music?.assetUrl,
      assetId: doc.music?.assetId,
      prompt: doc.music?.prompt,
      durationMs: doc.music?.durationMs,
      provider: doc.music?.provider,
      model: doc.music?.model,
      status: doc.music?.status,
    },
    soundEffects: (doc.soundEffects ?? []).map((sfx) => {
      const sceneIndex = doc.scenes.findIndex((s) => s.id === sfx.sceneId);
      return {
        id: sfx.id,
        sceneId: sfx.sceneId,
        sceneNumber: sceneIndex >= 0 ? sceneIndex + 1 : 0,
        prompt: sfx.prompt,
        startMs: sfx.startMs,
        durationMs: sfx.durationMs,
        assetUrl: sfx.assetUrl,
        status: sfx.status,
      };
    }),
    videoClips: doc.scenes
      .map((scene, index) => ({
        sceneId: scene.id,
        sceneNumber: index + 1,
        assetUrl: scene.background?.videoClip?.assetUrl,
        generationPrompt: scene.background?.videoClip?.generationPrompt,
        status: scene.background?.videoClip?.generationStatus,
        ready: hasReadyVideoBackground(scene),
      }))
      .filter((c) => c.ready || c.generationPrompt),
    assets: collectVideoAssetRefs(doc),
  };
}

export type ProductionKitSummary = {
  storyboard: { label: string; status: "ready" };
  voiceover: { label: string; status: "ready" | "missing" };
  music: { label: string; status: "ready" | "missing" };
  soundEffects: { label: string; count: number };
  visualAssets: { label: string; count: number };
  videoClips: { label: string; count: number };
};

export function buildProductionKitSummary(doc: VideoDocument): ProductionKitSummary {
  const refs = collectVideoAssetRefs(doc);
  const visualAssets = refs.filter(
    (r) => r.type === "background" || r.type === "image" || r.type === "logo",
  ).length;
  const readySfx = (doc.soundEffects ?? []).filter((s) => s.status === "ready" && s.assetUrl).length;
  const readyClips = doc.scenes.filter((s) => hasReadyVideoBackground(s)).length;

  return {
    storyboard: { label: "Storyboard", status: "ready" },
    voiceover: {
      label: "Voiceover",
      status: doc.voiceover?.assetUrl ? "ready" : "missing",
    },
    music: {
      label: "Music",
      status: doc.music?.status === "ready" && doc.music.assetUrl ? "ready" : "missing",
    },
    soundEffects: {
      label: "Sound Effects",
      count: readySfx,
    },
    visualAssets: {
      label: "Visual assets",
      count: visualAssets,
    },
    videoClips: {
      label: "Video clips",
      count: readyClips,
    },
  };
}
