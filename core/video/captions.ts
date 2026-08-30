import type { BrandProfile } from "@/core/types";
import type { CaptionTrack, VideoDocument, VideoScene } from "@/core/video/document";
import { uid } from "@/core/video/document";

function splitIntoPhrases(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function generateCaptionsFromScenes(
  scenes: VideoScene[],
  brand?: BrandProfile,
): CaptionTrack {
  const segments = scenes.flatMap((scene) => {
    const text = scene.script?.trim();
    if (!text) return [];
    const phrases = splitIntoPhrases(text);
    const sliceMs = Math.max(800, Math.floor(scene.durationMs / Math.max(phrases.length, 1)));
    return phrases.map((phrase, i) => ({
      id: uid("cap"),
      text: phrase,
      startMs: scene.startMs + i * sliceMs,
      durationMs: sliceMs,
      sceneId: scene.id,
    }));
  });

  return {
    segments,
    position: "bottom",
    fontSize: 42,
    fontFamily: brand?.fonts.body ?? "system-ui, sans-serif",
    color: brand?.defaultText ?? "#ffffff",
    backgroundColor: "#000000",
    backgroundOpacity: 0.55,
    activeColor: brand?.defaultAccent ?? "#ffffff",
    activeScale: 1.05,
  };
}

export function attachCaptionsToDocument(doc: VideoDocument, brand?: BrandProfile): VideoDocument {
  return {
    ...doc,
    captions: generateCaptionsFromScenes(doc.scenes, brand),
  };
}
