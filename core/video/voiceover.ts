import type { VideoDocument, VideoElement, VideoImageProps, VideoLogoProps } from "@/core/video/document";

/** Estimate MP3 duration from buffer size (mp3_44100_128 ≈ 128 kbps CBR). */
export function estimateMp3DurationMs(buffer: Buffer | Uint8Array, bitrateKbps = 128): number {
  let offset = 0;
  if (buffer.length >= 10 && String.fromCharCode(buffer[0]!, buffer[1]!, buffer[2]!) === "ID3") {
    const size =
      ((buffer[6]! & 0x7f) << 21) |
      ((buffer[7]! & 0x7f) << 14) |
      ((buffer[8]! & 0x7f) << 7) |
      (buffer[9]! & 0x7f);
    offset = 10 + size;
  }
  const audioBytes = Math.max(0, buffer.length - offset);
  return Math.round((audioBytes * 8) / (bitrateKbps * 1000) * 1000);
}

export type VoiceoverTimingStatus = {
  ok: boolean;
  exceedsReel: boolean;
  reelDurationMs: number;
  audioDurationMs: number;
  overflowMs: number;
};

export function getVoiceoverTimingStatus(doc: VideoDocument): VoiceoverTimingStatus | null {
  const audioDurationMs = doc.voiceover?.durationMs;
  if (audioDurationMs == null || audioDurationMs <= 0) return null;
  const reelDurationMs = doc.durationMs;
  const overflowMs = audioDurationMs - reelDurationMs;
  return {
    ok: overflowMs <= 0,
    exceedsReel: overflowMs > 0,
    reelDurationMs,
    audioDurationMs,
    overflowMs: Math.max(0, overflowMs),
  };
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/** Collect image/logo src URLs and assetIds from all scenes — for persistence checks. */
export function collectVideoAssetRefs(doc: VideoDocument): { src: string; assetId?: string; type: string }[] {
  const refs: { src: string; assetId?: string; type: string }[] = [];
  for (const scene of doc.scenes) {
    if (scene.background?.type === "image" && scene.background.value) {
      refs.push({ src: scene.background.value, assetId: scene.background.assetId, type: "background" });
    }
    if (scene.background?.type === "video") {
      const src = scene.background.videoClip?.assetUrl ?? scene.background.value;
      if (src) {
        refs.push({
          src,
          assetId: scene.background.videoClip?.assetId ?? scene.background.assetId,
          type: "video-background",
        });
      }
    }
    for (const el of scene.elements) {
      if (el.type === "image") {
        const p = el.props as VideoImageProps;
        if (p.src) refs.push({ src: p.src, assetId: p.assetId, type: "image" });
      }
      if (el.type === "logo") {
        const p = el.props as VideoLogoProps;
        if (p.src) refs.push({ src: p.src, assetId: p.logoId, type: "logo" });
      }
    }
  }
  if (doc.voiceover?.assetUrl) {
    refs.push({ src: doc.voiceover.assetUrl, assetId: doc.voiceover.assetId, type: "voiceover" });
  }
  if (doc.music?.assetUrl && doc.music.status === "ready") {
    refs.push({ src: doc.music.assetUrl, assetId: doc.music.assetId, type: "music" });
  }
  for (const sfx of doc.soundEffects ?? []) {
    if (sfx.status === "ready" && sfx.assetUrl) {
      refs.push({ src: sfx.assetUrl, assetId: sfx.assetId, type: "sfx" });
    }
  }
  return refs;
}

export function findMediaElements(doc: VideoDocument): VideoElement[] {
  return doc.scenes.flatMap((s) => s.elements.filter((e) => e.type === "image" || e.type === "logo"));
}
