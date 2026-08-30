import type { BrandProfile } from "@/core/types";
import type { VideoDocument, VideoScene } from "@/core/video/document";

export function buildSuggestedMusicPrompt(options: {
  doc: VideoDocument;
  brand: BrandProfile;
}): string {
  const { doc, brand } = options;
  const meta = doc.metadata;
  const lines: string[] = [
    `Instrumental background music for a ${meta.platform ?? "social"} ${meta.format ?? "reel"}.`,
    `Brand: ${brand.name}.`,
  ];
  if (meta.style) lines.push(`Mood/style: ${meta.style}.`);
  if (meta.brief) lines.push(`Brief: ${meta.brief}`);
  lines.push(`Duration target: ${Math.round(doc.durationMs / 1000)} seconds.`);

  const sceneHints = doc.scenes
    .map((s, i) => {
      const hint = s.visualDirection?.trim() || s.script?.trim();
      return hint ? `Scene ${i + 1}: ${hint}` : null;
    })
    .filter(Boolean)
    .slice(0, 4);
  if (sceneHints.length) lines.push(`Storyboard cues: ${sceneHints.join(" | ")}.`);

  lines.push("No vocals. Subtle, modern, edit-friendly bed suitable for manual assembly in CapCut or Premiere.");
  return lines.join(" ");
}

export function buildSuggestedSfxPrompt(scene: VideoScene, sceneIndex: number): string {
  const script = scene.script?.trim().toLowerCase() ?? "";
  const direction = scene.visualDirection?.trim().toLowerCase() ?? "";
  const transition = scene.transitionIn?.type ?? scene.transitionOut?.type;

  if (direction.includes("payment") || script.includes("pay") || script.includes("invoice")) {
    return "soft digital payment confirmation";
  }
  if (direction.includes("notification") || script.includes("alert")) {
    return "marketplace notification";
  }
  if (direction.includes("photo") || direction.includes("camera")) {
    return "camera shutter";
  }
  if (transition && transition !== "none" && transition !== "fade") {
    return "subtle UI whoosh transition";
  }
  if (sceneIndex === 0) {
    return "gentle impact hit";
  }
  if (script.includes("trust") || script.includes("secure")) {
    return "soft digital payment confirmation";
  }
  return "subtle UI whoosh transition";
}

export function sfxPromptSlug(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
