/** Supabase `project-assets` paths for reel production audio. */

export type ReelAudioKind = "voice" | "music" | "sfx";

export function reelAudioStoragePath(
  projectId: string,
  reelId: string,
  kind: ReelAudioKind,
  fileName: string,
): string {
  return `${projectId}/reels/${reelId}/${kind}/${fileName}`;
}

export function reelVoiceoverPath(projectId: string, reelId: string): string {
  return reelAudioStoragePath(projectId, reelId, "voice", "voiceover.mp3");
}

export function reelMusicPath(projectId: string, reelId: string): string {
  return reelAudioStoragePath(projectId, reelId, "music", "music.mp3");
}

export function reelSfxPath(projectId: string, reelId: string, sfxId: string): string {
  return reelAudioStoragePath(projectId, reelId, "sfx", `${sfxId}.mp3`);
}

export function reelVideoClipExportName(sceneIndex: number): string {
  return `scene-${String(sceneIndex + 1).padStart(2, "0")}.mp4`;
}

export function reelSfxExportName(sceneIndex: number, slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `scene-${String(sceneIndex + 1).padStart(2, "0")}-${safe || "sfx"}.mp3`;
}
