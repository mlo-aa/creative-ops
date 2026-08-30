"use client";

import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import type { StudioPost } from "@/core/types";
import type { VideoDocument, VideoElement, VideoScene } from "@/core/video/document";
import { cloneVideoDocument, syncVideoDuration, uid } from "@/core/video/document";
import { applyScriptToDocument } from "@/core/video/script";
import { getVoiceoverTimingStatus, formatDurationMs } from "@/core/video/voiceover";
import { VideoPreviewPlayer } from "@/core/video/remotion/VideoPreviewPlayer";
import { SceneVideoClipPanel } from "@/core/editor/SceneVideoClipPanel";
import { SceneSoundEffectPanel } from "@/core/editor/SceneSoundEffectPanel";
import { ReelVoiceoverPanel } from "@/core/editor/ReelVoiceoverPanel";
import { ReelMusicPanel } from "@/core/editor/ReelMusicPanel";
import { ReelAudioTimeline } from "@/core/editor/ReelAudioTimeline";
import { ProductionKitPanel } from "@/core/editor/ProductionKitPanel";
import { buildProductionKitSummary } from "@/core/video/production/manifest";
import { downloadBlob, exportProductionKitZip } from "@/core/video/production/export-kit";
import { btnGhost, btnPrimary, inputClass } from "@/core/ui/OpsField";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type RenderStatus = { available: boolean; requiresWorker: boolean; message: string };

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function VideoEditor({ post }: { post: StudioPost }) {
  const project = useProject();
  const {
    updateVideoDocument,
    generateVideoVoiceover,
    generateVideoMusic,
    generateSceneSoundEffect,
    generateVideoCaptions,
    exportVideoMp4,
  } = useStudio();

  const [doc, setDoc] = useState<VideoDocument>(() => cloneVideoDocument(post.video!));
  const [selectedSceneId, setSelectedSceneId] = useState(doc.scenes[0]?.id);
  const [selectedElementId, setSelectedElementId] = useState<string | undefined>();
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [capBusy, setCapBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [kitBusy, setKitBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exportError, setExportError] = useState(false);
  const [capError, setCapError] = useState("");
  const [voiceId, setVoiceId] = useState(
    () => post.video?.metadata.voiceId ?? post.video?.voiceover?.voiceId ?? "",
  );
  const [renderStatus, setRenderStatus] = useState<RenderStatus | null>(null);

  const selectedScene = doc.scenes.find((s) => s.id === selectedSceneId) ?? doc.scenes[0];
  const selectedElement = selectedScene?.elements.find((e) => e.id === selectedElementId);

  useEffect(() => {
    void fetch("/api/video/render/status")
      .then((r) => r.json())
      .then((d: RenderStatus) => setRenderStatus(d))
      .catch(() =>
        setRenderStatus({
          available: false,
          requiresWorker: true,
          message: "Could not determine render availability.",
        }),
      );
  }, []);

  const commit = useCallback(
    (next: VideoDocument) => {
      const synced = syncVideoDuration(next);
      setDoc(synced);
      updateVideoDocument(project.id, post.id, synced);
    },
    [project.id, post.id, updateVideoDocument],
  );

  const timingStatus = useMemo(() => getVoiceoverTimingStatus(doc), [doc]);
  const kitSummary = useMemo(() => buildProductionKitSummary(doc), [doc]);

  function commitWithScript(next: VideoDocument) {
    commit(applyScriptToDocument(next));
  }

  function updateScene(sceneId: string, patch: Partial<VideoScene>) {
    commitWithScript({
      ...doc,
      scenes: doc.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
    });
  }

  function updateElement(sceneId: string, elementId: string, patch: Partial<VideoElement>) {
    commit({
      ...doc,
      scenes: doc.scenes.map((s) =>
        s.id !== sceneId
          ? s
          : {
              ...s,
              elements: s.elements.map((el) => (el.id === elementId ? { ...el, ...patch } : el)),
            },
      ),
    });
  }

  function setVoice(vid: string) {
    setVoiceId(vid);
    commit({ ...doc, metadata: { ...doc.metadata, voiceId: vid } });
  }

  async function handleExportKit() {
    setKitBusy(true);
    setExportMsg("");
    setExportError(false);
    try {
      const { blob, folderName } = await exportProductionKitZip({
        doc,
        brand: project.brand,
        project: { id: project.id, name: project.name },
        postId: post.id,
      });
      downloadBlob(blob, `${folderName}-production-kit.zip`);
      setExportMsg("Production kit downloaded.");
    } catch {
      setExportError(true);
      setExportMsg("Production kit export failed.");
    } finally {
      setKitBusy(false);
    }
  }

  function addScene() {
    const dur = 3000;
    const startMs = doc.scenes.reduce((n, s) => n + s.durationMs, 0);
    const scene: VideoScene = {
      id: uid("scene"),
      startMs,
      durationMs: dur,
      script: "",
      background: { type: "color", value: project.brand.colors[0]?.hex ?? "#171717" },
      elements: [],
    };
    commitWithScript({ ...doc, scenes: [...doc.scenes, scene] });
    setSelectedSceneId(scene.id);
  }

  function duplicateScene(sceneId: string) {
    const src = doc.scenes.find((s) => s.id === sceneId);
    if (!src) return;
    const copy = cloneVideoDocument({ ...doc, scenes: [src] }).scenes[0]!;
    copy.id = uid("scene");
    copy.elements = copy.elements.map((e) => ({ ...e, id: uid("el") }));
    commitWithScript({ ...doc, scenes: [...doc.scenes, copy] });
  }

  function deleteScene(sceneId: string) {
    if (doc.scenes.length <= 1) return;
    const scenes = doc.scenes.filter((s) => s.id !== sceneId);
    commitWithScript({ ...doc, scenes });
    setSelectedSceneId(scenes[0]?.id);
  }

  function reorderScene(sceneId: string, dir: -1 | 1) {
    const idx = doc.scenes.findIndex((s) => s.id === sceneId);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= doc.scenes.length) return;
    const scenes = [...doc.scenes];
    [scenes[idx], scenes[next]] = [scenes[next]!, scenes[idx]!];
    commitWithScript({ ...doc, scenes });
  }

  async function handleExport() {
    setExportBusy(true);
    setExportMsg("");
    setExportError(false);
    try {
      const res = await exportVideoMp4(project.id, post.id);
      if (res.ok && res.publicUrl) {
        setExportMsg(`Exported: ${res.publicUrl}`);
      } else if (res.requiresWorker) {
        setExportError(true);
        setExportMsg(
          res.errorMessage ??
            "Production rendering requires a render worker. MP4 export is not available on Vercel serverless.",
        );
      } else {
        setExportError(true);
        setExportMsg(res.errorMessage ?? "Export failed");
      }
    } catch {
      setExportError(true);
      setExportMsg("Export request failed. Check server logs.");
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-[#111] text-white">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href={`/projects/${project.id}/posts`} className="text-xs uppercase opacity-50">
          ← Posts
        </Link>
        <input
          className={`${inputClass} max-w-xs`}
          value={doc.title}
          onChange={(e) => commit({ ...doc, title: e.target.value })}
        />
        <span className="text-xs opacity-40">
          {doc.width}×{doc.height} · {formatMs(doc.durationMs)}
        </span>
        <div className="ml-auto flex flex-col items-end gap-1">
          <button type="button" className={btnPrimary} disabled={kitBusy} onClick={() => void handleExportKit()}>
            {kitBusy ? "Building kit…" : "Export production kit"}
          </button>
          <p className="text-[10px] opacity-35">
            VO {kitSummary.voiceover.status} · Music {kitSummary.music.status} · SFX {kitSummary.soundEffects.count}
          </p>
          {renderStatus?.requiresWorker ? (
            <p className="max-w-xs text-right text-[10px] leading-snug text-amber-200/90">
              Production rendering requires a render worker
            </p>
          ) : null}
          {renderStatus?.available ? (
            <button type="button" className={btnGhost} disabled={exportBusy} onClick={handleExport}>
              {exportBusy ? "Rendering…" : "Export MP4"}
            </button>
          ) : (
            <button
              type="button"
              className={`${btnGhost} cursor-not-allowed opacity-50`}
              disabled
              title={renderStatus?.message}
            >
              Export MP4 (requires render worker)
            </button>
          )}
        </div>
      </header>

      {exportMsg ? (
        <p
          className={`border-b border-white/10 px-4 py-2 text-xs ${exportError ? "text-red-300" : "text-amber-200"}`}
        >
          {exportMsg}
        </p>
      ) : null}

      {timingStatus?.exceedsReel ? (
        <div className="border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-xs text-amber-100">
          Voiceover ({formatDurationMs(timingStatus.audioDurationMs)}) is longer than the reel (
          {formatDurationMs(timingStatus.reelDurationMs)}) by{" "}
          {formatDurationMs(timingStatus.overflowMs)}. Shorten the script or extend scene durations.
          Audio is not truncated — adjust timing before export.
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[220px_1fr_280px]">
        <aside className="border-b border-white/10 p-3 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-[10px] uppercase tracking-widest opacity-40">Scenes</p>
          <div className="space-y-2">
            {doc.scenes.map((scene, i) => (
              <button
                key={scene.id}
                type="button"
                className="w-full border border-white/10 p-2 text-left"
                style={{ borderColor: selectedSceneId === scene.id ? "rgba(126,203,168,0.5)" : undefined }}
                onClick={() => {
                  setSelectedSceneId(scene.id);
                  setSelectedElementId(undefined);
                }}
              >
                <p className="text-xs font-medium">Scene {i + 1}</p>
                <p className="text-[10px] opacity-40">{(scene.durationMs / 1000).toFixed(1)}s</p>
              </button>
            ))}
          </div>
          <button type="button" className={`${btnGhost} mt-3 w-full text-xs`} onClick={addScene}>
            + Add scene
          </button>
          {selectedScene ? (
            <div className="mt-3 flex flex-wrap gap-1">
              <button type="button" className={btnGhost} onClick={() => duplicateScene(selectedScene.id)}>
                Duplicate
              </button>
              <button type="button" className={btnGhost} onClick={() => deleteScene(selectedScene.id)}>
                Delete
              </button>
              <button type="button" className={btnGhost} onClick={() => reorderScene(selectedScene.id, -1)}>
                ↑
              </button>
              <button type="button" className={btnGhost} onClick={() => reorderScene(selectedScene.id, 1)}>
                ↓
              </button>
            </div>
          ) : null}
        </aside>

        <main className="flex flex-col items-center justify-center p-4">
          <div className="aspect-[9/16] w-full max-w-[360px] overflow-hidden border border-white/15 bg-black">
            <VideoPreviewPlayer
              document={doc}
              playing={playing}
              onPlayingChange={setPlaying}
              seekMs={currentMs}
            />
          </div>
          {doc.captions ? (
            <p className="mt-2 text-[10px] opacity-40">
              {doc.captions.segments.length} caption segments
            </p>
          ) : (
            <p className="mt-2 text-[10px] opacity-30">No captions yet</p>
          )}
        </main>

        <aside className="border-t border-white/10 p-3 lg:border-l lg:border-t-0">
          {selectedScene ? (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest opacity-40">Scene</p>
              <label className="block text-xs opacity-60">
                Duration (ms)
                <input
                  type="number"
                  className={`${inputClass} mt-1`}
                  value={selectedScene.durationMs}
                  onChange={(e) =>
                    updateScene(selectedScene.id, { durationMs: Number(e.target.value) || 1000 })
                  }
                />
              </label>
              {selectedScene.background?.type === "video" ? (
                <p className="text-xs opacity-45">Video background — use clip controls below to regenerate or remove.</p>
              ) : (
                <label className="block text-xs opacity-60">
                  Background
                  <input
                    className={`${inputClass} mt-1`}
                    value={selectedScene.background?.value ?? ""}
                    onChange={(e) =>
                      updateScene(selectedScene.id, {
                        background: { type: "color", value: e.target.value },
                      })
                    }
                  />
                </label>
              )}
              <label className="block text-xs opacity-60">
                Script
                <textarea
                  className={`${inputClass} mt-1`}
                  rows={3}
                  value={selectedScene.script ?? ""}
                  onChange={(e) => updateScene(selectedScene.id, { script: e.target.value })}
                />
              </label>
              <label className="block text-xs opacity-60">
                Visual direction
                <textarea
                  className={`${inputClass} mt-1`}
                  rows={2}
                  value={selectedScene.visualDirection ?? ""}
                  onChange={(e) => updateScene(selectedScene.id, { visualDirection: e.target.value })}
                />
              </label>
              <SceneVideoClipPanel
                scene={selectedScene}
                doc={doc}
                brand={project.brand}
                projectId={project.id}
                onSceneChange={(next) =>
                  updateScene(selectedScene.id, {
                    script: next.script,
                    visualDirection: next.visualDirection,
                    background: next.background,
                  })
                }
              />
              <SceneSoundEffectPanel
                scene={selectedScene}
                sceneIndex={doc.scenes.findIndex((s) => s.id === selectedScene.id)}
                doc={doc}
                projectId={project.id}
                postId={post.id}
                onDocChange={commit}
                generateSoundEffect={generateSceneSoundEffect}
              />
              <p className="text-[10px] uppercase tracking-widest opacity-40">Elements</p>
              {selectedScene.elements.length === 0 ? (
                <p className="text-xs opacity-35">No elements in this scene</p>
              ) : null}
              {selectedScene.elements.map((el) => (
                <button
                  key={el.id}
                  type="button"
                  className="block w-full border border-white/10 px-2 py-1 text-left text-xs"
                  style={{ borderColor: selectedElementId === el.id ? "rgba(126,203,168,0.5)" : undefined }}
                  onClick={() => setSelectedElementId(el.id)}
                >
                  {el.name} ({el.type})
                </button>
              ))}
            </div>
          ) : null}

          {selectedElement && selectedScene ? (
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              <p className="text-[10px] uppercase tracking-widest opacity-40">Element</p>
              {selectedElement.type === "text" && "content" in selectedElement.props ? (
                <textarea
                  className={inputClass}
                  rows={3}
                  value={selectedElement.props.content}
                  onChange={(e) =>
                    updateElement(selectedScene.id, selectedElement.id, {
                      props: { ...selectedElement.props, content: e.target.value },
                    })
                  }
                />
              ) : null}
              {(selectedElement.type === "image" || selectedElement.type === "logo") &&
              "src" in selectedElement.props ? (
                <p className="truncate text-[10px] opacity-40" title={selectedElement.props.src}>
                  {selectedElement.props.src}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <label key={key} className="text-[10px] uppercase opacity-50">
                    {key}
                    <input
                      type="number"
                      className={`${inputClass} mt-1`}
                      value={selectedElement[key]}
                      onChange={(e) =>
                        updateElement(selectedScene.id, selectedElement.id, {
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <select
                className={inputClass}
                value={selectedElement.animationIn?.type ?? "fade"}
                onChange={(e) =>
                  updateElement(selectedScene.id, selectedElement.id, {
                    animationIn: {
                      type: e.target.value as NonNullable<VideoElement["animationIn"]>["type"],
                      durationMs: 400,
                    },
                  })
                }
              >
                {["fade", "fade-up", "fade-down", "slide-left", "slide-right", "scale-in", "none"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <ReelVoiceoverPanel
            doc={doc}
            projectId={project.id}
            postId={post.id}
            voiceId={voiceId}
            onVoiceIdChange={setVoice}
            onDocChange={commit}
            onResetToSceneScripts={(next) => commit(next)}
            generateVoiceover={generateVideoVoiceover}
          />

          <ReelMusicPanel
            doc={doc}
            brand={project.brand}
            projectId={project.id}
            postId={post.id}
            onDocChange={commit}
            generateMusic={generateVideoMusic}
          />

          <ProductionKitPanel
            doc={doc}
            brand={project.brand}
            project={{ id: project.id, name: project.name }}
            postId={post.id}
          />

          <div className="space-y-2 border-t border-white/10 pt-4">
            <p className="text-[10px] uppercase tracking-widest opacity-40">Captions</p>
            {capError ? <p className="text-xs text-red-400">{capError}</p> : null}
            <button
              type="button"
              className={btnGhost}
              disabled={capBusy}
              onClick={async () => {
                setCapBusy(true);
                setCapError("");
                try {
                  const updated = await generateVideoCaptions(project.id, post.id);
                  if (updated) setDoc(cloneVideoDocument(updated));
                } catch (e) {
                  setCapError(e instanceof Error ? e.message : "Caption generation failed");
                } finally {
                  setCapBusy(false);
                }
              }}
            >
              {capBusy ? "Generating…" : "Generate captions"}
            </button>
          </div>
        </aside>
      </div>

      <footer className="border-t border-white/10 p-4">
        <div className="mb-2 flex items-center gap-3">
          <button type="button" className={btnGhost} onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Play"}
          </button>
          <input
            type="range"
            min={0}
            max={doc.durationMs}
            value={currentMs}
            onChange={(e) => {
              setCurrentMs(Number(e.target.value));
              setPlaying(false);
            }}
            className="flex-1"
          />
          <span className="text-xs opacity-50">
            {formatMs(currentMs)} / {formatMs(doc.durationMs)}
          </span>
        </div>
        <ReelAudioTimeline doc={doc} />
        <div className="mt-2 flex h-12 overflow-hidden rounded border border-white/10">
          {doc.scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className="h-full border-r border-white/10 bg-white/5 text-[10px] hover:bg-white/10"
              style={{ flex: scene.durationMs }}
              onClick={() => {
                setSelectedSceneId(scene.id);
                setCurrentMs(scene.startMs);
              }}
            >
              {(scene.durationMs / 1000).toFixed(1)}s
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
