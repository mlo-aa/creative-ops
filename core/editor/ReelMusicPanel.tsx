import { buildSuggestedMusicPrompt } from "@/core/video/audio/prompts";
import { downloadAudioUrl } from "@/core/video/production/export-kit";
import type { BrandProfile } from "@/core/types";
import type { VideoDocument } from "@/core/video/document";
import { formatDurationMs } from "@/core/video/voiceover";
import { btnPrimary, inputClass } from "@/core/ui/OpsField";
import { CollapsibleSection, DropdownMenu, MenuItem } from "@/core/ui/workspace-ui";
import { useEffect, useState } from "react";

export function ReelMusicPanel({
  doc,
  brand,
  projectId,
  postId,
  onDocChange,
  generateMusic,
  embedded = false,
}: {
  doc: VideoDocument;
  brand: BrandProfile;
  projectId: string;
  postId: string;
  onDocChange: (next: VideoDocument) => void;
  generateMusic: (projectId: string, postId: string, prompt: string) => Promise<VideoDocument | null>;
  embedded?: boolean;
}) {
  const suggested = buildSuggestedMusicPrompt({ doc, brand });
  const [prompt, setPrompt] = useState(doc.music?.prompt ?? suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!doc.music?.prompt) setPrompt(suggested);
  }, [doc.id, suggested, doc.music?.prompt]);

  const ready = doc.music?.status === "ready" && Boolean(doc.music.assetUrl);
  const planRestricted =
    !ready &&
    (error.toLowerCase().includes("plan") || error.toLowerCase().includes("not available"));

  async function handleGenerate() {
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
  }

  const statusLabel = ready ? "Ready" : busy ? "Generating" : planRestricted ? "Unavailable on plan" : "Not generated";

  if (planRestricted && embedded) {
    return (
      <CollapsibleSection title="Music" defaultOpen={false} summary={<span>{statusLabel}</span>}>
        <p className="text-xs opacity-55">
          Music generation is not available on your current ElevenLabs plan. Voiceover and sound effects still work.
        </p>
      </CollapsibleSection>
    );
  }

  const body = (
    <>
      {!ready ? (
        <label className="block text-xs opacity-60">
          Prompt
          <textarea className={`${inputClass} mt-1`} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </label>
      ) : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {ready && doc.music?.assetUrl ? (
        <div className="space-y-2">
          <audio controls src={doc.music.assetUrl} className="w-full" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] opacity-40">
              {doc.music.durationMs ? formatDurationMs(doc.music.durationMs) : "Ready"}
            </p>
            <DropdownMenu
              label="Music actions"
              trigger={
                <span className="inline-flex h-7 items-center border border-white/15 px-2 text-[10px] uppercase opacity-60">
                  ···
                </span>
              }
            >
              <MenuItem onClick={() => void handleGenerate()} disabled={busy}>
                Regenerate
              </MenuItem>
              <MenuItem onClick={() => doc.music?.assetUrl && downloadAudioUrl(doc.music.assetUrl, "music.mp3")}>
                Download
              </MenuItem>
              <MenuItem onClick={() => onDocChange({ ...doc, music: undefined })}>Remove</MenuItem>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={busy || !prompt.trim()}
          onClick={() => void handleGenerate()}
        >
          {busy ? "Generating…" : "Generate music"}
        </button>
      )}
    </>
  );

  if (embedded) {
    return (
      <CollapsibleSection title="Music" defaultOpen={!ready && !planRestricted} summary={<span>{statusLabel}</span>}>
        {body}
      </CollapsibleSection>
    );
  }

  return (
    <div className="space-y-2 border-t border-white/10 pt-4">
      <p className="text-[10px] uppercase tracking-widest opacity-40">Music</p>
      {body}
    </div>
  );
}
