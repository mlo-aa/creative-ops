import { formatElevenLabsUiMessage } from "@/core/video/audio/elevenlabs-errors";
import { downloadAudioUrl } from "@/core/video/production/export-kit";
import type { VideoDocument } from "@/core/video/document";
import { formatDurationMs } from "@/core/video/voiceover";
import {
  getEffectiveVoiceoverScript,
  hasManualVoiceoverOverride,
  isVoiceoverAudioStale,
  resetVoiceoverToSceneScripts,
  sceneScriptsChangedSinceManualOverride,
  scriptCharacterCount,
  setVoiceoverManualOverride,
} from "@/core/video/script";
import {
  estimateNarrationDurationMs,
  formatVoiceoverValidationError,
  narrationExceedsReel,
  validateVoiceoverScript,
} from "@/core/video/script-validation";
import { btnPrimary, inputClass } from "@/core/ui/OpsField";
import { CollapsibleSection, DropdownMenu, MenuItem } from "@/core/ui/workspace-ui";
import { useEffect, useMemo, useState } from "react";

type Voice = { voiceId: string; name: string; previewUrl: string | null };

export function ReelVoiceoverPanel({
  doc,
  projectId,
  postId,
  voiceId,
  onVoiceIdChange,
  onDocChange,
  onResetToSceneScripts,
  generateVoiceover,
  embedded = false,
}: {
  doc: VideoDocument;
  projectId: string;
  postId: string;
  voiceId: string;
  onVoiceIdChange: (voiceId: string) => void;
  onDocChange: (next: VideoDocument) => void;
  onResetToSceneScripts: (next: VideoDocument) => void;
  generateVoiceover: (projectId: string, postId: string) => Promise<VideoDocument | null>;
  embedded?: boolean;
}) {
  const [voBusy, setVoBusy] = useState(false);
  const [voError, setVoError] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesError, setVoicesError] = useState("");

  useEffect(() => {
    void fetch("/api/audio/voices")
      .then((r) => r.json())
      .then((d: { voices?: Voice[]; errorMessage?: string; code?: string }) => {
        if (d.errorMessage || d.code) {
          setVoicesError(formatElevenLabsUiMessage(d.code, d.errorMessage));
        }
        setVoices(d.voices ?? []);
      })
      .catch(() => setVoicesError("Could not load voices."));
  }, []);

  const scriptText = getEffectiveVoiceoverScript(doc);
  const charCount = useMemo(() => scriptCharacterCount(scriptText), [scriptText]);
  const estimatedMs = useMemo(() => estimateNarrationDurationMs(scriptText), [scriptText]);
  const validation = useMemo(() => validateVoiceoverScript(scriptText), [scriptText]);
  const exceedsEstimate = narrationExceedsReel(scriptText, doc.durationMs);
  const voiceName = voices.find((v) => v.voiceId === (doc.voiceover?.voiceId ?? voiceId))?.name;
  const sceneScriptsChanged = sceneScriptsChangedSinceManualOverride(doc);
  const audioStale = isVoiceoverAudioStale(doc);
  const manualOverride = hasManualVoiceoverOverride(doc);

  function onAudioMetadata(durationSec: number) {
    if (!doc.voiceover) return;
    const measuredMs = Math.round(durationSec * 1000);
    if (measuredMs > 0 && measuredMs !== doc.voiceover.durationMs) {
      onDocChange({
        ...doc,
        voiceover: { ...doc.voiceover, durationMs: measuredMs },
      });
    }
  }

  const hasAudio = Boolean(doc.voiceover?.assetUrl);
  const statusLabel = hasAudio
    ? audioStale
      ? "Stale"
      : "Ready"
    : voBusy
      ? "Generating"
      : "Not generated";

  async function handleGenerate() {
    setVoBusy(true);
    setVoError("");
    try {
      if (!voiceId) {
        setVoError("Select a voice before generating voiceover.");
        return;
      }
      const preCheck = validateVoiceoverScript(scriptText);
      if (!preCheck.ok) {
        setVoError(formatVoiceoverValidationError(preCheck));
        return;
      }
      onDocChange(setVoiceoverManualOverride({ ...doc, metadata: { ...doc.metadata, voiceId } }, scriptText));
      const updated = await generateVoiceover(projectId, postId);
      if (updated) onDocChange(updated);
    } catch (e) {
      setVoError(e instanceof Error ? e.message : "Voiceover failed");
    } finally {
      setVoBusy(false);
    }
  }

  const body = (
    <>

      {voicesError ? <p className="text-xs text-amber-200/90">{voicesError}</p> : null}
      {voices.length === 0 && !voicesError ? (
        <p className="text-xs opacity-40">No voices loaded — configure ELEVENLABS_API_KEY</p>
      ) : (
        <select className={inputClass} value={voiceId} onChange={(e) => onVoiceIdChange(e.target.value)}>
          {voices.map((v) => (
            <option key={v.voiceId} value={v.voiceId}>
              {v.name}
            </option>
          ))}
        </select>
      )}

      <textarea
        className={inputClass}
        rows={4}
        value={scriptText}
        onChange={(e) => onDocChange(setVoiceoverManualOverride(doc, e.target.value))}
        onBlur={(e) => onDocChange(setVoiceoverManualOverride(doc, e.target.value))}
      />
      <p className="text-[10px] opacity-40">
        {charCount} characters · estimated {formatDurationMs(estimatedMs)} · reel{" "}
        {formatDurationMs(doc.durationMs)}
      </p>

      {sceneScriptsChanged ? (
        <p className="text-xs text-amber-200/80">
          Scene scripts changed. Voiceover has manual edits.
        </p>
      ) : null}

      {!validation.ok ? (
        <div className="rounded border border-amber-500/30 bg-amber-950/30 px-2 py-1.5 text-xs text-amber-100 whitespace-pre-line">
          {formatVoiceoverValidationError(validation)}
        </div>
      ) : null}

      {exceedsEstimate && validation.ok ? (
        <p className="text-xs text-amber-200/90">
          Estimated narration ({formatDurationMs(estimatedMs)}) exceeds reel duration (
          {formatDurationMs(doc.durationMs)}). Shorten the script or extend scenes before generating.
        </p>
      ) : null}

      {audioStale ? (
        <p className="text-xs text-amber-200/80">
          Voiceover audio was generated from an earlier script. Regenerate to update the audio file.
        </p>
      ) : null}

      {voError ? <p className="text-xs text-red-400 whitespace-pre-line">{voError}</p> : null}

      {hasAudio ? (
        <div className="space-y-2">
          <audio
            controls
            src={doc.voiceover!.assetUrl}
            className="w-full"
            onLoadedMetadata={(e) => onAudioMetadata(e.currentTarget.duration)}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] opacity-40">
              {doc.voiceover?.durationMs ? formatDurationMs(doc.voiceover.durationMs) : ""}
              {voiceName ? ` · ${voiceName}` : ""}
              {manualOverride ? " · manual edit" : ""}
            </p>
            <DropdownMenu
              label="Voiceover actions"
              trigger={
                <span className="inline-flex h-7 items-center border border-white/15 px-2 text-[10px] uppercase opacity-60">
                  ···
                </span>
              }
            >
              <MenuItem onClick={() => void handleGenerate()} disabled={voBusy || !validation.ok}>
                Regenerate
              </MenuItem>
              <MenuItem onClick={() => downloadAudioUrl(doc.voiceover!.assetUrl!, "voiceover.mp3")}>
                Download
              </MenuItem>
              {manualOverride ? (
                <MenuItem onClick={() => onResetToSceneScripts(resetVoiceoverToSceneScripts(doc))}>
                  Reset to scene scripts
                </MenuItem>
              ) : null}
            </DropdownMenu>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={voBusy || !scriptText.trim() || !voiceId || !validation.ok}
          onClick={() => void handleGenerate()}
        >
          {voBusy ? "Generating…" : "Generate voiceover"}
        </button>
      )}
    </>
  );

  if (embedded) {
    return (
      <CollapsibleSection
        title="Voiceover"
        defaultOpen={!hasAudio || audioStale}
        summary={<span>{statusLabel}</span>}
      >
        {body}
      </CollapsibleSection>
    );
  }

  return (
    <div className="space-y-2 border-t border-white/10 pt-4">
      <p className="text-[10px] uppercase tracking-widest opacity-40">Voiceover</p>
      {body}
    </div>
  );
}
