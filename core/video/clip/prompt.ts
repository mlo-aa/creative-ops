import type { BrandProfile } from "@/core/types";
import type { VideoDocumentMetadata, VideoScene } from "@/core/video/document";

export function buildSuggestedClipPrompt(options: {
  scene: VideoScene;
  brand: BrandProfile;
  metadata: VideoDocumentMetadata;
}): string {
  const { scene, brand, metadata } = options;
  const lines: string[] = [
    `9:16 vertical reel clip for ${brand.name}.`,
  ];

  if (metadata.style) lines.push(`Style: ${metadata.style}.`);
  if (metadata.platform) lines.push(`Platform: ${metadata.platform}.`);
  if (metadata.brief) lines.push(`Context: ${metadata.brief}`);
  if (scene.script?.trim()) lines.push(`Scene script: ${scene.script.trim()}`);
  if (scene.visualDirection?.trim()) lines.push(`Visual direction: ${scene.visualDirection.trim()}`);

  const accent = brand.colors.find((c) => c.id === brand.defaultAccent)?.hex;
  const bg = brand.colors.find((c) => c.id === brand.defaultBackground)?.hex;
  if (accent || bg) {
    lines.push(`Brand colors: ${[bg, accent].filter(Boolean).join(", ")}.`);
  }

  lines.push("Cinematic b-roll, brand-consistent lighting, no on-screen text or logos in the footage.");
  return lines.join(" ");
}
