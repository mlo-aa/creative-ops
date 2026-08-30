"use client";

import type { BrandProfile } from "@/core/types";
import type { VideoDocument, VideoScene } from "@/core/video/document";
import {
  hasReadyVideoBackground,
  removeVideoClipBackground,
  sceneHasVideoClipIntent,
  upsertVideoClipBackground,
} from "@/core/video/clip/background";
import { buildSuggestedClipPrompt } from "@/core/video/clip/prompt";
import {
  CLIP_GENERATION_UNAVAILABLE,
  disabledVideoClipProvider,
} from "@/core/video/clip/provider";
import { btnGhost, btnPrimary, inputClass } from "@/core/ui/OpsField";
import { CollapsibleSection } from "@/core/ui/workspace-ui";
import { useEffect, useState } from "react";

export function SceneVideoClipPanel({
  scene,
  doc,
  brand,
  projectId,
  onSceneChange,
  embedded = false,
}: {
  scene: VideoScene;
  doc: VideoDocument;
  brand: BrandProfile;
  projectId: string;
  onSceneChange: (next: VideoScene) => void;
  embedded?: boolean;
}) {
  const suggested = buildSuggestedClipPrompt({ scene, brand, metadata: doc.metadata });
  const [prompt, setPrompt] = useState(
    scene.background?.videoClip?.generationPrompt ?? suggested,
  );
  const [clipError, setClipError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrompt(scene.background?.videoClip?.generationPrompt ?? suggested);
  }, [scene.id, scene.background?.videoClip?.generationPrompt, suggested]);

  const ready = hasReadyVideoBackground(scene);
  const hasClip = sceneHasVideoClipIntent(scene);

  async function handleGenerate() {
    setBusy(true);
    setClipError("");
    const withPrompt = upsertVideoClipBackground(scene, {
      generationPrompt: prompt.trim() || suggested,
      generationStatus: "generating",
      durationMs: scene.durationMs,
    });
    onSceneChange(withPrompt);

    const result = await disabledVideoClipProvider.generateClip({
      prompt: prompt.trim() || suggested,
      durationMs: scene.durationMs,
      aspectRatio: "9:16",
      projectId,
      sceneId: scene.id,
    });

    if (!result.ok) {
      onSceneChange(
        upsertVideoClipBackground(withPrompt, {
          generationPrompt: prompt.trim() || suggested,
          generationStatus: "failed",
          durationMs: scene.durationMs,
          provider: result.provider,
        }),
      );
      setClipError(result.error ?? CLIP_GENERATION_UNAVAILABLE);
      setBusy(false);
      return;
    }

    onSceneChange(
      upsertVideoClipBackground(withPrompt, {
        generationPrompt: prompt.trim() || suggested,
        generationStatus: "ready",
        assetUrl: result.assetUrl,
        assetId: result.assetId,
        provider: result.provider,
        model: result.model,
        durationMs: result.durationMs ?? scene.durationMs,
      }),
    );
    setBusy(false);
  }

  function handleRemove() {
    setClipError("");
    onSceneChange(removeVideoClipBackground(scene, brand.colors[0]?.hex ?? "#171717"));
  }

  const statusLabel = ready ? "Ready" : busy ? "Generating" : hasClip ? "Failed" : "Not generated";

  const body = (
    <>
      {!ready ? (
        <label className="block text-xs opacity-60">
          Generation prompt
          <textarea
            className={`${inputClass} mt-1`}
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
      ) : null}
      {clipError ? <p className="text-xs text-amber-200/90">{clipError}</p> : null}
      {ready ? (
        <div className="flex flex-wrap gap-1">
          <button type="button" className={btnGhost} disabled={busy} onClick={() => void handleGenerate()}>
            {busy ? "…" : "Regenerate"}
          </button>
          <button type="button" className={btnGhost} onClick={handleRemove}>
            Remove video
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={busy || !prompt.trim()}
          onClick={() => void handleGenerate()}
        >
          {busy ? "Generating…" : "Generate video"}
        </button>
      )}
      {hasClip && !ready ? (
        <button type="button" className={`${btnGhost} w-full`} onClick={handleRemove}>
          Remove video
        </button>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <CollapsibleSection title="Video clip" defaultOpen={hasClip} summary={<span>{statusLabel}</span>}>
        {body}
      </CollapsibleSection>
    );
  }

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <p className="text-[10px] uppercase tracking-widest opacity-40">Video clip</p>
      {body}
    </div>
  );
}
