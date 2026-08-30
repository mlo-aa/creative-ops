import type { BrandProfile } from "@/core/types";
import type { VideoDocument } from "@/core/video/document";
import { hasReadyVideoBackground } from "@/core/video/clip/background";
import { reelSfxExportName, reelVideoClipExportName } from "@/core/video/audio/storage-paths";
import { sfxPromptSlug } from "@/core/video/audio/prompts";
import { buildReelManifest } from "@/core/video/production/manifest";
import {
  soundEffectsMarkdown,
  storyboardToJson,
  storyboardToMarkdown,
  videoPromptsMarkdown,
} from "@/core/video/production/storyboard-export";
import { collectVideoAssetRefs } from "@/core/video/voiceover";

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function exportProductionKitZip(options: {
  doc: VideoDocument;
  project: { id: string; name: string };
  brand: BrandProfile;
  postId: string;
}): Promise<{ blob: Blob; folderName: string }> {
  const { doc, project, brand, postId } = options;
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folderName = `${slugify(project.name)}-reel`;
  const root = zip.folder(folderName)!;

  root.file("storyboard.md", storyboardToMarkdown(doc, brand, project.name));
  root.file("storyboard.json", JSON.stringify(storyboardToJson(doc, brand, project.name), null, 2));

  const prompts = root.folder("prompts")!;
  prompts.file("video-prompts.md", videoPromptsMarkdown(doc, brand));
  prompts.file("music-prompt.txt", doc.music?.prompt ?? "");
  prompts.file("sound-effects.md", soundEffectsMarkdown(doc));

  const manifest = buildReelManifest(doc, project, brand);
  root.file("reel-manifest.json", JSON.stringify(manifest, null, 2));

  const audio = root.folder("audio")!;
  if (doc.voiceover?.assetUrl) {
    const blob = await fetchBlob(doc.voiceover.assetUrl);
    if (blob) audio.file("voiceover.mp3", blob);
  }
  if (doc.music?.assetUrl && doc.music.status === "ready") {
    const blob = await fetchBlob(doc.music.assetUrl);
    if (blob) audio.file("music.mp3", blob);
  }

  const sfxFolder = root.folder("sfx")!;
  for (const sfx of doc.soundEffects ?? []) {
    if (sfx.status !== "ready" || !sfx.assetUrl) continue;
    const sceneIndex = doc.scenes.findIndex((s) => s.id === sfx.sceneId);
    const fileName = reelSfxExportName(sceneIndex >= 0 ? sceneIndex : 0, sfxPromptSlug(sfx.prompt));
    const blob = await fetchBlob(sfx.assetUrl);
    if (blob) sfxFolder.file(fileName, blob);
  }

  const videoFolder = root.folder("video")!;
  for (let i = 0; i < doc.scenes.length; i++) {
    const scene = doc.scenes[i]!;
    if (!hasReadyVideoBackground(scene)) continue;
    const url = scene.background?.videoClip?.assetUrl ?? scene.background?.value;
    if (!url) continue;
    const blob = await fetchBlob(url);
    if (blob) videoFolder.file(reelVideoClipExportName(i), blob);
  }

  const assetsFolder = root.folder("assets")!;
  const refs = collectVideoAssetRefs(doc);
  const seen = new Set<string>();
  let assetIndex = 0;
  for (const ref of refs) {
    if (ref.type === "voiceover" || ref.type === "video-background") continue;
    if (seen.has(ref.src)) continue;
    seen.add(ref.src);
    const blob = await fetchBlob(ref.src);
    if (!blob) continue;
    assetIndex += 1;
    const ext = ref.src.includes(".png")
      ? "png"
      : ref.src.includes(".webp")
        ? "webp"
        : ref.src.includes(".jpg") || ref.src.includes(".jpeg")
          ? "jpg"
          : "bin";
    const name = ref.assetId ? `${ref.assetId}.${ext}` : `asset-${assetIndex}.${ext}`;
    assetsFolder.file(name, blob);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, folderName };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportStoryboardJson(doc: VideoDocument, brand: BrandProfile, projectName: string) {
  const json = JSON.stringify(storyboardToJson(doc, brand, projectName), null, 2);
  downloadBlob(new Blob([json], { type: "application/json" }), `${slugify(doc.title)}-storyboard.json`);
}

export function exportStoryboardMarkdown(doc: VideoDocument, brand: BrandProfile, projectName: string) {
  const md = storyboardToMarkdown(doc, brand, projectName);
  downloadBlob(new Blob([md], { type: "text/markdown" }), `${slugify(doc.title)}-storyboard.md`);
}

export function downloadAudioUrl(url: string, fileName: string) {
  void fetch(url)
    .then((r) => r.blob())
    .then((blob) => downloadBlob(blob, fileName))
    .catch(() => undefined);
}
