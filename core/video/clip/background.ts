import type { VideoBackground, VideoClipGenerationStatus, VideoScene } from "@/core/video/document";

export function getVideoBackgroundSrc(background?: VideoBackground): string | undefined {
  if (!background || background.type !== "video") return undefined;
  const url = background.videoClip?.assetUrl ?? background.value;
  return url?.trim() ? url : undefined;
}

export function hasReadyVideoBackground(scene: VideoScene): boolean {
  const bg = scene.background;
  if (!bg || bg.type !== "video") return false;
  const status = bg.videoClip?.generationStatus;
  return status === "ready" && Boolean(getVideoBackgroundSrc(bg));
}

export function sceneHasVideoClipIntent(scene: VideoScene): boolean {
  const bg = scene.background;
  return bg?.type === "video" || Boolean(bg?.videoClip);
}

export function upsertVideoClipBackground(
  scene: VideoScene,
  patch: {
    generationPrompt: string;
    generationStatus?: VideoClipGenerationStatus;
    assetUrl?: string;
    assetId?: string;
    provider?: string;
    model?: string;
    durationMs?: number;
  },
): VideoScene {
  const prev = scene.background;
  const clip = {
    ...(prev?.videoClip ?? {}),
    generationPrompt: patch.generationPrompt,
    generationStatus: patch.generationStatus ?? prev?.videoClip?.generationStatus ?? "idle",
    assetUrl: patch.assetUrl ?? prev?.videoClip?.assetUrl,
    assetId: patch.assetId ?? prev?.videoClip?.assetId,
    provider: patch.provider ?? prev?.videoClip?.provider,
    model: patch.model ?? prev?.videoClip?.model,
    durationMs: patch.durationMs ?? prev?.videoClip?.durationMs ?? scene.durationMs,
  };

  const assetUrl = clip.assetUrl ?? "";
  return {
    ...scene,
    background: {
      type: "video",
      value: assetUrl,
      assetId: clip.assetId,
      videoClip: clip,
    },
  };
}

export function removeVideoClipBackground(scene: VideoScene, fallbackColor: string): VideoScene {
  if (scene.background?.type === "image") return scene;
  return {
    ...scene,
    background: { type: "color", value: fallbackColor },
  };
}
