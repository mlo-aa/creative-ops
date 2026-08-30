import { buildSuggestedMusicPrompt } from "@/core/video/audio/prompts";
import { downloadAudioUrl } from "@/core/video/production/export-kit";
import type { BrandProfile } from "@/core/types";
import type { VideoDocument } from "@/core/video/document";
import { formatDurationMs } from "@/core/video/voiceover";
import { btnGhost, btnPrimary, inputClass } from "@/core/ui/OpsField";
import { useEffect, useState } from "react";

export function ReelMusicPanel({
  doc,
  brand,
  projectId,
  postId,
  onDocChange,
  generateMusic,
}: {
  doc: VideoDocument;
  brand: BrandProfile;
  projectId: string;
  postId: string;
  onDocChange: (next: VideoDocument) => void;
  generateMusic: (projectId: string, postId: string, prompt: string) => Promise<VideoDocument | null>;
}) {
  const suggested = buildSuggestedMusicPrompt({ doc, brand });
  const [prompt, setPrompt] = useState(doc.music?.prompt ?? suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!doc.music?.prompt) setPrompt(suggested);
  }, [doc.id, suggested, doc.music?.prompt]);

  const ready = doc.music?.status === "ready" && Boolean(doc.music.assetUrl);

  return (
    <div className="space-y-2 border-t border-white/10 pt-4">
      <p className="text-[10px] uppercase tracking-widest opacity-40">Music</p>
      <label className="block text-xs opacity-60">
        Generation prompt
        <textarea className={`${inputClass} mt-1`} rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </label>
      {doc.music?.status ? (
        <p className="text-[10px] opacity-40">
          Status: {doc.music.status}
          {doc.music.provider ? ` · ${doc.music.provider}` : ""}
          {doc.music.model ? ` · ${doc.music.model}` : ""}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <button
        type="button"
        className={btnPrimary}
        disabled={busy || !prompt.trim()}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const updated = await generateMusic(projectId, postId, prompt.trim());
            if (updated) onDocChange(updated);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Music generation failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Generating music…" : ready ? "Regenerate music" : "Generate music"}
      </button>
      {ready && doc.music?.assetUrl ? (
        <div className="space-y-1">
          <audio controls src={doc.music.assetUrl} className="w-full" />
          {doc.music?.durationMs ? (
            <p className="text-[10px] opacity-40">Duration: {formatDurationMs(doc.music.durationMs)}</p>
          ) : null}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={btnGhost}
              onClick={() => doc.music?.assetUrl && downloadAudioUrl(doc.music.assetUrl, "music.mp3")}
            >
              Download
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={() => onDocChange({ ...doc, music: undefined })}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs opacity-35">No music generated yet</p>
      )}
    </div>
  );
}
