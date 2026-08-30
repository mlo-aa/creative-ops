"use client";

import { useStudio } from "@/core/store";
import { useOptionalProject } from "@/core/project/context";
import type { GenerateStoryboardBrief } from "@/core/video/generation/provider";
import { REEL_DURATIONS } from "@/core/video/document";
import { btnGhost, btnPrimary, inputClass } from "@/core/ui/OpsField";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Voice = { voiceId: string; name: string; previewUrl: string | null };
type ProviderStatus = {
  provider: "claude" | "mock" | "unconfigured";
  model: string | null;
  message?: string;
};

export function NewReelModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId?: string;
}) {
  const contextProject = useOptionalProject();
  const { generateStoryboard, generateVideoVoiceover, ops, getProject } = useStudio();
  const project = useMemo(
    () => (projectId ? getProject(projectId) : contextProject) ?? null,
    [projectId, getProject, contextProject],
  );
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genNotice, setGenNotice] = useState("");
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [brief, setBrief] = useState<GenerateStoryboardBrief & {
    generateVoiceover: boolean;
    generateCaptions: boolean;
    addMusicLater: boolean;
    customDurationMs?: number;
  }>({
    brief: "",
    platform: "instagram",
    format: "reel",
    style: "editorial",
    durationMs: 15_000,
    creativeFreedom: "medium",
    generateVoiceover: false,
    generateCaptions: true,
    addMusicLater: true,
    title: "",
  });
  const [voiceId, setVoiceId] = useState("");
  const [durationPreset, setDurationPreset] = useState<string>("15000");

  useEffect(() => {
    if (!open) return;
    void fetch("/api/video/storyboard")
      .then((r) => r.json())
      .then((d: ProviderStatus) => setProviderStatus(d))
      .catch(() => setProviderStatus({ provider: "unconfigured", model: null }));
    void fetch("/api/audio/voices")
      .then((r) => r.json())
      .then((d: { voices?: Voice[] }) => {
        setVoices(d.voices ?? []);
        if (d.voices?.[0]) setVoiceId(d.voices[0].voiceId);
      })
      .catch(() => setVoices([]));
  }, [open]);

  const runGenerate = useCallback(async () => {
    if (!project) return;
    setGenerating(true);
    setGenError("");
    setGenNotice("");
    try {
      const result = await generateStoryboard(
        project.id,
        { ...brief, title: brief.title || undefined },
        voiceId || undefined,
      );
      if (result.fallbackFromClaude) {
        setGenNotice(result.notice ?? "Claude is unavailable. Using mock storyboard for development.");
        setProviderStatus({
          provider: "mock",
          model: null,
          message: result.mockReason ?? "Mock storyboard · Claude credits unavailable",
        });
      }
      if (brief.generateVoiceover && voiceId) {
        await generateVideoVoiceover(project.id, result.postId);
      }
      onClose();
      router.push(`/projects/${project.id}/posts/${result.postId}`);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Storyboard generation failed");
    } finally {
      setGenerating(false);
    }
  }, [brief, generateStoryboard, generateVideoVoiceover, onClose, project, router, voiceId]);

  if (!open) return null;

  if (!project) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-md border border-white/15 bg-[#171717] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg tracking-[-0.03em]">Project required</h2>
          <p className="mt-2 text-sm opacity-50">Select a project before creating a reel.</p>
          <button type="button" className={`${btnGhost} mt-4`} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const providerLabel =
    providerStatus?.message ??
    (providerStatus?.provider === "claude"
      ? `Claude · ${providerStatus.model ?? "configured"}`
      : providerStatus?.provider === "mock"
        ? "Mock provider (dev — no ANTHROPIC_API_KEY)"
        : "Unavailable — configure ANTHROPIC_API_KEY");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto border border-white/15 bg-[#171717] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl tracking-[-0.03em]">New reel / video</h2>
        <p className="mt-2 text-sm opacity-50">1080×1920 · 9:16 · editable storyboard</p>
        <p className="mt-1 text-[11px] opacity-40">Storyboard provider: {providerLabel}</p>
        {genNotice ? (
          <p className="mt-2 text-sm text-[#b8e6cc]">{genNotice}</p>
        ) : null}

        <div className="mt-6 space-y-4">
          <textarea
            className={inputClass}
            rows={4}
            placeholder="Brief — what should this reel communicate?"
            value={brief.brief}
            onChange={(e) => setBrief({ ...brief, brief: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Title (optional)"
            value={brief.title ?? ""}
            onChange={(e) => setBrief({ ...brief, title: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className={inputClass} value={brief.platform} onChange={(e) => setBrief({ ...brief, platform: e.target.value })}>
              {["instagram", "tiktok", "linkedin"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className={inputClass}
              value={durationPreset}
              onChange={(e) => {
                setDurationPreset(e.target.value);
                setBrief({
                  ...brief,
                  durationMs: e.target.value === "custom" ? brief.durationMs : Number(e.target.value),
                });
              }}
            >
              {REEL_DURATIONS.map((d) => (
                <option key={d} value={String(d)}>{d / 1000}s</option>
              ))}
              <option value="custom">Custom</option>
            </select>
            {durationPreset === "custom" ? (
              <input
                type="number"
                className={inputClass}
                placeholder="Duration ms"
                value={brief.durationMs}
                onChange={(e) => setBrief({ ...brief, durationMs: Number(e.target.value) || 15_000 })}
              />
            ) : null}
            <select className={inputClass} value={brief.style} onChange={(e) => setBrief({ ...brief, style: e.target.value })}>
              {["editorial", "product", "testimonial", "announcement"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className={inputClass}
              value={brief.creativeFreedom}
              onChange={(e) => setBrief({ ...brief, creativeFreedom: e.target.value as GenerateStoryboardBrief["creativeFreedom"] })}
            >
              <option value="low">Creative freedom: low</option>
              <option value="medium">Creative freedom: medium</option>
              <option value="high">Creative freedom: high</option>
            </select>
          </div>

          <select
            className={inputClass}
            value={brief.campaignId ?? ""}
            onChange={(e) => setBrief({ ...brief, campaignId: e.target.value || undefined })}
          >
            <option value="">No campaign</option>
            {ops.campaigns.filter((c) => c.projectId === project.id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={brief.generateVoiceover}
              onChange={(e) => setBrief({ ...brief, generateVoiceover: e.target.checked })}
            />
            Generate voiceover after storyboard (requires ElevenLabs)
          </label>

          {brief.generateVoiceover ? (
            <select className={inputClass} value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
              {voices.length ? voices.map((v) => (
                <option key={v.voiceId} value={v.voiceId}>{v.name}</option>
              )) : (
                <option value="">No voices — configure ELEVENLABS_API_KEY</option>
              )}
            </select>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={brief.generateCaptions}
              onChange={(e) => setBrief({ ...brief, generateCaptions: e.target.checked })}
            />
            Generate captions from script
          </label>

          <label className="flex items-center gap-2 text-sm opacity-60">
            <input type="checkbox" checked={brief.addMusicLater} disabled />
            Add music later (V1 placeholder)
          </label>
        </div>

        {genError ? (
          <p className="mt-4 text-sm text-red-400">{genError}</p>
        ) : null}

        <button
          type="button"
          className={`${btnPrimary} mt-6`}
          disabled={generating || !brief.brief.trim() || providerStatus?.provider === "unconfigured"}
          onClick={() => void runGenerate()}
        >
          {generating ? `Generating storyboard${providerStatus?.provider === "claude" ? " with Claude…" : "…"}` : "Generate storyboard"}
        </button>
        {genError ? (
          <button type="button" className={`${btnGhost} mt-3`} disabled={generating} onClick={() => void runGenerate()}>
            Retry
          </button>
        ) : null}
        <button type="button" className={`${btnGhost} mt-3`} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
