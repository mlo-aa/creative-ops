/** Structured video document — source of truth for reel/video posts. */

import type { BrandProfile } from "@/core/types";

export type VideoAnimationType =
  | "fade"
  | "fade-up"
  | "fade-down"
  | "slide-left"
  | "slide-right"
  | "scale-in"
  | "none";

export type VideoElementType = "text" | "image" | "logo" | "rectangle" | "circle" | "line" | "group";

export type VideoTransition = {
  type: VideoAnimationType;
  durationMs: number;
};

export type VideoElementAnimation = {
  type: VideoAnimationType;
  durationMs: number;
  delayMs?: number;
};

export type VideoClipGenerationStatus = "idle" | "generating" | "ready" | "failed";

export type AudioGenerationStatus = "idle" | "generating" | "ready" | "failed";

export type VideoClipBackground = {
  assetId?: string;
  assetUrl?: string;
  generationStatus: VideoClipGenerationStatus;
  generationPrompt?: string;
  provider?: string;
  model?: string;
  durationMs?: number;
};

export type VideoBackground = {
  type: "color" | "image" | "video";
  value: string;
  assetId?: string;
  videoClip?: VideoClipBackground;
};

export type VideoTextProps = {
  content: string;
  fontSize: number;
  fontWeight: number | string;
  color: string;
  align: "left" | "center" | "right";
  uppercase?: boolean;
};

export type VideoImageProps = {
  src: string;
  assetId?: string;
  objectFit: "cover" | "contain";
};

export type VideoLogoProps = {
  logoId: string;
  src: string;
  mode?: "isotipo" | "wordmark" | "primary";
};

export type VideoShapeProps = {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
};

export type VideoLineProps = {
  stroke: string;
  strokeWidth: number;
  x2: number;
  y2: number;
};

export type VideoGroupProps = {
  childIds: string[];
};

export type VideoElementProps =
  | VideoTextProps
  | VideoImageProps
  | VideoLogoProps
  | VideoShapeProps
  | VideoLineProps
  | VideoGroupProps;

export type VideoElement = {
  id: string;
  type: VideoElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  zIndex: number;
  startOffsetMs: number;
  durationMs: number;
  animationIn?: VideoElementAnimation;
  animationOut?: VideoElementAnimation;
  props: VideoElementProps;
};

export type VideoScene = {
  id: string;
  startMs: number;
  durationMs: number;
  script?: string;
  visualDirection?: string;
  background?: VideoBackground;
  elements: VideoElement[];
  transitionIn?: VideoTransition;
  transitionOut?: VideoTransition;
};

export type CaptionSegment = {
  id: string;
  text: string;
  startMs: number;
  durationMs: number;
  sceneId?: string;
};

export type CaptionTrack = {
  segments: CaptionSegment[];
  position: "top" | "center" | "bottom";
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  activeColor?: string;
  activeScale?: number;
};

export type VideoVoiceover = {
  assetUrl: string;
  assetId?: string;
  voiceId: string;
  modelId: string;
  durationMs?: number;
  script?: string;
  characterCount?: number;
  costMetadata?: Record<string, unknown>;
};

export type VideoMusic = {
  assetUrl?: string;
  volume: number;
  assetId?: string;
  prompt?: string;
  durationMs?: number;
  provider?: string;
  model?: string;
  status?: AudioGenerationStatus;
};

export type VideoSoundEffect = {
  id: string;
  sceneId: string;
  assetId?: string;
  assetUrl?: string;
  prompt: string;
  startMs: number;
  durationMs: number;
  provider?: string;
  model?: string;
  status: AudioGenerationStatus;
};

export type VideoDocumentMetadata = {
  brief?: string;
  platform?: string;
  format?: string;
  style?: string;
  campaignId?: string;
  generatedBy?: "manual" | "mock" | "claude";
  creativeFreedom?: "low" | "medium" | "high";
  generateVoiceover?: boolean;
  generateCaptions?: boolean;
  voiceId?: string;
  modelId?: string;
};

export type VideoDocument = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  /** Combined voiceover text shown in editor — mirrors effective script. */
  script?: string;
  /** When set, voiceover script is manually edited and must not be rebuilt from scenes. */
  voiceoverScriptOverride?: string;
  /** Scene script fingerprint when manual override was last saved — detects scene edits. */
  voiceoverSceneScriptHash?: string;
  scenes: VideoScene[];
  voiceover?: VideoVoiceover;
  captions?: CaptionTrack;
  music?: VideoMusic;
  soundEffects?: VideoSoundEffect[];
  metadata: VideoDocumentMetadata;
};

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const REEL_FPS = 30;
export const REEL_DURATIONS = [10_000, 15_000, 30_000] as const;

export function uid(prefix = "v"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function cloneVideoDocument(doc: VideoDocument): VideoDocument {
  return structuredClone(doc);
}

export function blankReelDocument(
  projectId: string,
  title: string,
  durationMs = 15_000,
  brand?: BrandProfile,
): VideoDocument {
  const bg = brand?.colors[0]?.hex ?? "#171717";
  const accent = brand?.colors[1]?.hex ?? "#ffffff";
  return {
    schemaVersion: 1,
    id: uid("reel"),
    projectId,
    title,
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    fps: REEL_FPS,
    durationMs,
    scenes: [
      {
        id: uid("scene"),
        startMs: 0,
        durationMs,
        script: "",
        background: { type: "color", value: bg },
        elements: [
          {
            id: uid("el"),
            type: "text",
            name: "Headline",
            x: 80,
            y: 800,
            width: 920,
            height: 200,
            opacity: 1,
            rotation: 0,
            zIndex: 1,
            startOffsetMs: 0,
            durationMs: durationMs - 500,
            animationIn: { type: "fade-up", durationMs: 600 },
            props: {
              content: title,
              fontSize: 72,
              fontWeight: 700,
              color: accent,
              align: "center",
            },
          },
        ],
        transitionIn: { type: "fade", durationMs: 400 },
      },
    ],
    metadata: { format: "reel", platform: "instagram" },
  };
}

export function recalculateSceneTiming(scenes: VideoScene[]): VideoScene[] {
  let cursor = 0;
  return scenes.map((scene) => {
    const next = { ...scene, startMs: cursor };
    cursor += scene.durationMs;
    return next;
  });
}

export function totalDurationFromScenes(scenes: VideoScene[]): number {
  return scenes.reduce((sum, s) => sum + s.durationMs, 0);
}

export function syncVideoDuration(doc: VideoDocument): VideoDocument {
  const scenes = recalculateSceneTiming(doc.scenes);
  const durationMs = totalDurationFromScenes(scenes);
  return { ...doc, scenes, durationMs };
}
