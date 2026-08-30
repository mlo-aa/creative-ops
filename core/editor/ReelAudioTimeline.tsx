import type { VideoDocument } from "@/core/video/document";
import { formatDurationMs } from "@/core/video/voiceover";

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function TrackBar({
  label,
  color,
  totalMs,
  segments,
}: {
  label: string;
  color: string;
  totalMs: number;
  segments: { startMs: number; durationMs: number; title: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest opacity-40">{label}</p>
      <div className="relative h-8 overflow-hidden rounded border border-white/10 bg-black/40">
        {segments.length === 0 ? (
          <span className="absolute inset-0 flex items-center px-2 text-[10px] opacity-30">—</span>
        ) : (
          segments.map((seg) => (
            <div
              key={`${seg.title}-${seg.startMs}`}
              className="absolute top-1 bottom-1 overflow-hidden rounded px-1 text-[9px] leading-tight"
              style={{
                left: `${(seg.startMs / totalMs) * 100}%`,
                width: `${Math.max((seg.durationMs / totalMs) * 100, 2)}%`,
                backgroundColor: color,
              }}
              title={`${seg.title} · ${formatDurationMs(seg.durationMs)}`}
            >
              <span className="block truncate opacity-90">{seg.title}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ReelAudioTimeline({ doc }: { doc: VideoDocument }) {
  const totalMs = Math.max(doc.durationMs, 1);

  const voiceSegments =
    doc.voiceover?.assetUrl && doc.voiceover.durationMs
      ? [{ startMs: 0, durationMs: doc.voiceover.durationMs, title: "Voiceover" }]
      : doc.voiceover?.assetUrl
        ? [{ startMs: 0, durationMs: doc.durationMs, title: "Voiceover" }]
        : [];

  const musicSegments =
    doc.music?.status === "ready" && doc.music.assetUrl
      ? [
          {
            startMs: 0,
            durationMs: doc.music.durationMs ?? doc.durationMs,
            title: "Music",
          },
        ]
      : [];

  const sfxSegments = (doc.soundEffects ?? [])
    .filter((s) => s.status === "ready")
    .map((s) => ({
      startMs: s.startMs,
      durationMs: s.durationMs,
      title: s.prompt.slice(0, 24),
    }));

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest opacity-40">Audio timeline</p>
        <span className="text-[10px] opacity-35">{formatMs(totalMs)}</span>
      </div>
      <TrackBar label="Voice" color="rgba(126,203,168,0.55)" totalMs={totalMs} segments={voiceSegments} />
      <TrackBar label="Music" color="rgba(120,160,255,0.55)" totalMs={totalMs} segments={musicSegments} />
      <TrackBar label="SFX" color="rgba(255,190,120,0.55)" totalMs={totalMs} segments={sfxSegments} />
    </div>
  );
}
