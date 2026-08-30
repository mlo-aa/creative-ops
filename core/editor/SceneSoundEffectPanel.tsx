import { buildSuggestedSfxPrompt } from "@/core/video/audio/prompts";
import { downloadAudioUrl } from "@/core/video/production/export-kit";
import type { VideoDocument, VideoScene, VideoSoundEffect } from "@/core/video/document";
import { uid } from "@/core/video/document";
import { formatDurationMs } from "@/core/video/voiceover";
import { btnGhost, btnPrimary, inputClass } from "@/core/ui/OpsField";
import { CollapsibleSection } from "@/core/ui/workspace-ui";
import { useEffect, useMemo, useState } from "react";

export function SceneSoundEffectPanel({
  scene,
  sceneIndex,
  doc,
  projectId,
  postId,
  onDocChange,
  generateSoundEffect,
  embedded = false,
}: {
  scene: VideoScene;
  sceneIndex: number;
  doc: VideoDocument;
  projectId: string;
  postId: string;
  onDocChange: (next: VideoDocument) => void;
  generateSoundEffect: (
    projectId: string,
    postId: string,
    sceneId: string,
    prompt: string,
    sfxId?: string,
  ) => Promise<VideoDocument | null>;
  embedded?: boolean;
}) {
  const sceneEffects = useMemo(
    () => (doc.soundEffects ?? []).filter((s) => s.sceneId === scene.id),
    [doc.soundEffects, scene.id],
  );
  const [adding, setAdding] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState(buildSuggestedSfxPrompt(scene, sceneIndex));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adding) setDraftPrompt(buildSuggestedSfxPrompt(scene, sceneIndex));
  }, [scene.id, sceneIndex, adding, scene]);

  function removeEffect(id: string) {
    onDocChange({
      ...doc,
      soundEffects: (doc.soundEffects ?? []).filter((s) => s.id !== id),
    });
  }

  const inner = (
    <>
      {sceneEffects.map((sfx) => (
        <SoundEffectRow
          key={sfx.id}
          sfx={sfx}
          busy={busyId === sfx.id}
          onRegenerate={async (prompt) => {
            setBusyId(sfx.id);
            setError("");
            try {
              const updated = await generateSoundEffect(projectId, postId, scene.id, prompt, sfx.id);
              if (updated) onDocChange(updated);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Sound effect failed");
            } finally {
              setBusyId(null);
            }
          }}
          onRemove={() => removeEffect(sfx.id)}
        />
      ))}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {adding ? (
        <div className="space-y-2">
          <textarea
            className={inputClass}
            rows={2}
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={btnPrimary}
              disabled={Boolean(busyId) || !draftPrompt.trim()}
              onClick={async () => {
                const id = uid("sfx");
                setBusyId(id);
                setError("");
                try {
                  const updated = await generateSoundEffect(projectId, postId, scene.id, draftPrompt.trim(), id);
                  if (updated) {
                    onDocChange(updated);
                    setAdding(false);
                  }
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Sound effect failed");
                } finally {
                  setBusyId(null);
                }
              }}
            >
              {busyId ? "Generating…" : "Generate sound effect"}
            </button>
            <button type="button" className={btnGhost} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${btnGhost} w-full text-xs`} onClick={() => setAdding(true)}>
          + Add sound effect
        </button>
      )}
    </>
  );

  if (embedded) {
    return (
      <CollapsibleSection
        title="Scene sound effects"
        defaultOpen={sceneEffects.length > 0 || adding}
        summary={<span>{sceneEffects.length ? `${sceneEffects.length} effect(s)` : "None"}</span>}
      >
        {inner}
      </CollapsibleSection>
    );
  }

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <p className="text-[10px] uppercase tracking-widest opacity-40">Sound effects</p>
      {inner}
    </div>
  );
}

function SoundEffectRow({
  sfx,
  busy,
  onRegenerate,
  onRemove,
}: {
  sfx: VideoSoundEffect;
  busy: boolean;
  onRegenerate: (prompt: string) => Promise<void>;
  onRemove: () => void;
}) {
  const [prompt, setPrompt] = useState(sfx.prompt);
  const ready = sfx.status === "ready" && Boolean(sfx.assetUrl);

  useEffect(() => setPrompt(sfx.prompt), [sfx.prompt]);

  return (
    <div className="space-y-1 rounded border border-white/10 p-2">
      <textarea className={inputClass} rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <p className="text-[10px] opacity-40">
        {sfx.status}
        {sfx.durationMs ? ` · ${formatDurationMs(sfx.durationMs)}` : ""}
      </p>
      {ready && sfx.assetUrl ? <audio controls src={sfx.assetUrl} className="w-full" /> : null}
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btnGhost} disabled={busy} onClick={() => void onRegenerate(prompt.trim())}>
          {busy ? "…" : "Regenerate"}
        </button>
        {ready && sfx.assetUrl ? (
          <button type="button" className={btnGhost} onClick={() => downloadAudioUrl(sfx.assetUrl!, `${sfx.id}.mp3`)}>
            Download
          </button>
        ) : null}
        <button type="button" className={btnGhost} onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
