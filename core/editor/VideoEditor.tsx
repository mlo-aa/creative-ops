"use client";

import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import type { StudioPost } from "@/core/types";
import { ReelExportMenu } from "@/core/editor/ReelExportMenu";
import { ReelVoiceoverPanel } from "@/core/editor/ReelVoiceoverPanel";
import { ReelMusicPanel } from "@/core/editor/ReelMusicPanel";
import { SceneSoundEffectPanel } from "@/core/editor/SceneSoundEffectPanel";
import { SceneVideoClipPanel } from "@/core/editor/SceneVideoClipPanel";
import { ReelAudioTimeline } from "@/core/editor/ReelAudioTimeline";
import type { VideoDocument, VideoElement, VideoScene } from "@/core/video/document";
import { cloneVideoDocument, syncVideoDuration, uid } from "@/core/video/document";
import { applyScriptToDocument } from "@/core/video/script";
import { getVoiceoverTimingStatus, formatDurationMs } from "@/core/video/voiceover";
import { VideoPreviewPlayer } from "@/core/video/remotion/VideoPreviewPlayer";
import { btnGhost, btnPrimary, inputClass } from "@/core/ui/OpsField";
import {
  CollapsibleSection,
  IconButton,
  InspectorPanel,
  InspectorTabBar,
  SceneActionsMenu,
  StatusDot,
} from "@/core/ui/workspace-ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type RenderStatus = { available: boolean; requiresWorker: boolean; message: string };
type InspectorMode = "scene" | "visual" | "audio";

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function hasReelAudio(doc: VideoDocument) {
  return (
    Boolean(doc.voiceover?.assetUrl) ||
    (doc.music?.status === "ready" && Boolean(doc.music.assetUrl)) ||
    (doc.soundEffects ?? []).some((s) => s.status === "ready" && s.assetUrl)
  );
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
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>("scene");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [capBusy, setCapBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exportError, setExportError] = useState(false);
  const [capError, setCapError] = useState("");
  const [voiceId, setVoiceId] = useState(
    () => post.video?.metadata.voiceId ?? post.video?.voiceover?.voiceId ?? "",
  );
  const [renderStatus, setRenderStatus] = useState<RenderStatus | null>(null);

  const selectedScene = doc.scenes.find((s) => s.id === selectedSceneId) ?? doc.scenes[0];
  const selectedElement = selectedScene?.elements.find((e) => e.id === selectedElementId);
  const selectedSceneIndex = doc.scenes.findIndex((s) => s.id === selectedScene?.id);

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
  const showAudioTimeline = hasReelAudio(doc);

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
    setInspectorMode("scene");
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

  async function handleExportMp4() {
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

  function selectScene(sceneId: string) {
    setSelectedSceneId(sceneId);
    setSelectedElementId(undefined);
    setInspectorMode("scene");
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-[#111] text-white">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href={`/projects/${project.id}/posts`}
          className="text-xs uppercase opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
        >
          ← Designs
        </Link>
        <input
          aria-label="Reel title"
          className={`${inputClass} max-w-[200px] sm:max-w-xs`}
          value={doc.title}
          onChange={(e) => commit({ ...doc, title: e.target.value })}
        />
        <span className="hidden text-xs opacity-40 sm:inline">
          {doc.width}×{doc.height} · {formatMs(doc.durationMs)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <StatusDot
            status={
              doc.voiceover?.assetUrl
                ? timingStatus?.exceedsReel
                  ? "stale"
                  : "ready"
                : "missing"
            }
          />
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setPlaying(true);
              document.getElementById("reel-preview")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            Preview
          </button>
          <ReelExportMenu
            doc={doc}
            brand={project.brand}
            project={{ id: project.id, name: project.name }}
            postId={post.id}
            renderStatus={renderStatus}
            onExportMp4={() => void handleExportMp4()}
            exportBusy={exportBusy}
          />
        </div>
      </header>

      {exportMsg ? (
        <p
          className={`border-b border-white/10 px-4 py-2 text-xs ${exportError ? "text-red-300" : "text-amber-200"}`}
          role="status"
        >
          {exportMsg}
        </p>
      ) : null}

      {timingStatus?.exceedsReel ? (
        <div className="border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-xs text-amber-100" role="alert">
          Voiceover exceeds reel length by {formatDurationMs(timingStatus.overflowMs)}. Adjust script or scene timing
          before export.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {leftOpen ? (
          <aside className="w-full shrink-0 border-b border-white/10 p-3 lg:w-[200px] lg:border-b-0 lg:border-r xl:w-[220px]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest opacity-40">Scenes</p>
              <IconButton label="Hide scene list" onClick={() => setLeftOpen(false)}>
                ‹
              </IconButton>
            </div>
            <div className="space-y-1.5">
              {doc.scenes.map((scene, i) => (
                <button
                  key={scene.id}
                  type="button"
                  aria-current={selectedSceneId === scene.id ? "true" : undefined}
                  className="w-full rounded border border-white/10 p-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
                  style={{ borderColor: selectedSceneId === scene.id ? "rgba(126,203,168,0.5)" : undefined }}
                  onClick={() => selectScene(scene.id)}
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
              <div className="mt-3 flex justify-end">
                <SceneActionsMenu
                  onDuplicate={() => duplicateScene(selectedScene.id)}
                  onDelete={() => deleteScene(selectedScene.id)}
                  onMoveUp={() => reorderScene(selectedScene.id, -1)}
                  onMoveDown={() => reorderScene(selectedScene.id, 1)}
                  canMoveUp={selectedSceneIndex > 0}
                  canMoveDown={selectedSceneIndex >= 0 && selectedSceneIndex < doc.scenes.length - 1}
                  canDelete={doc.scenes.length > 1}
                />
              </div>
            ) : null}
          </aside>
        ) : (
          <div className="border-b border-white/10 p-2 lg:border-b-0 lg:border-r">
            <IconButton label="Show scene list" onClick={() => setLeftOpen(true)}>
              ›
            </IconButton>
          </div>
        )}

        <main id="reel-preview" className="flex min-w-0 flex-1 flex-col items-center p-4">
          <div className="aspect-[9/16] w-full max-w-[340px] overflow-hidden border border-white/15 bg-black">
            <VideoPreviewPlayer
              document={doc}
              playing={playing}
              onPlayingChange={setPlaying}
              seekMs={currentMs}
            />
          </div>

          <div className="mt-4 flex w-full max-w-[340px] items-center gap-3">
            <button
              type="button"
              className={btnGhost}
              aria-label={playing ? "Pause preview" : "Play preview"}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <input
              type="range"
              aria-label="Preview timeline"
              min={0}
              max={doc.durationMs}
              value={currentMs}
              onChange={(e) => {
                setCurrentMs(Number(e.target.value));
                setPlaying(false);
              }}
              className="min-w-0 flex-1"
            />
            <span className="shrink-0 text-[10px] opacity-50">
              {formatMs(currentMs)} / {formatMs(doc.durationMs)}
            </span>
          </div>

          {doc.captions ? (
            <p className="mt-2 text-[10px] opacity-40">{doc.captions.segments.length} caption segments</p>
          ) : null}
        </main>

        {rightOpen ? (
          <aside className="w-full shrink-0 border-t border-white/10 p-3 lg:w-[280px] lg:border-l lg:border-t-0 xl:w-[300px]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest opacity-40">Inspector</p>
              <IconButton label="Hide inspector" onClick={() => setRightOpen(false)}>
                ›
              </IconButton>
            </div>

            <InspectorTabBar
              tabs={[
                { id: "scene" as const, label: "Scene" },
                { id: "visual" as const, label: "Visual" },
                { id: "audio" as const, label: "Audio" },
              ]}
              active={inspectorMode}
              onChange={setInspectorMode}
              ariaLabel="Reel inspector"
            />

            {selectedScene ? (
              <>
                <InspectorPanel id="panel-scene" labelledBy="tab-scene" hidden={inspectorMode !== "scene"}>
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
                  {selectedScene.transitionIn ? (
                    <p className="text-[10px] opacity-40">
                      Transition in: {selectedScene.transitionIn.type}
                    </p>
                  ) : null}
                </InspectorPanel>

                <InspectorPanel id="panel-visual" labelledBy="tab-visual" hidden={inspectorMode !== "visual"}>
                  {selectedScene.background?.type === "video" ? (
                    <p className="text-xs opacity-45">Video background active.</p>
                  ) : (
                    <label className="block text-xs opacity-60">
                      Background color
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

                  <SceneVideoClipPanel
                    embedded
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

                  <CollapsibleSection
                    title="Elements"
                    defaultOpen={selectedScene.elements.length > 0}
                    summary={
                      <span>
                        {selectedScene.elements.length
                          ? `${selectedScene.elements.length} element(s)`
                          : "None"}
                      </span>
                    }
                  >
                    {selectedScene.elements.length === 0 ? (
                      <p className="text-xs opacity-35">No elements in this scene</p>
                    ) : null}
                    {selectedScene.elements.map((el) => (
                      <button
                        key={el.id}
                        type="button"
                        className="block w-full border border-white/10 px-2 py-1 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
                        style={{
                          borderColor: selectedElementId === el.id ? "rgba(126,203,168,0.5)" : undefined,
                        }}
                        onClick={() => {
                          setSelectedElementId(el.id);
                          setInspectorMode("visual");
                        }}
                      >
                        {el.name} ({el.type})
                      </button>
                    ))}

                    {selectedElement && selectedScene ? (
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                        <p className="text-[10px] uppercase tracking-widest opacity-40">
                          {selectedElement.name}
                        </p>
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
                          aria-label="Element animation"
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
                          {["fade", "fade-up", "fade-down", "slide-left", "slide-right", "scale-in", "none"].map(
                            (a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    ) : null}
                  </CollapsibleSection>
                </InspectorPanel>

                <InspectorPanel id="panel-audio" labelledBy="tab-audio" hidden={inspectorMode !== "audio"}>
                  <ReelVoiceoverPanel
                    embedded
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
                    embedded
                    doc={doc}
                    brand={project.brand}
                    projectId={project.id}
                    postId={post.id}
                    onDocChange={commit}
                    generateMusic={generateVideoMusic}
                  />
                  <SceneSoundEffectPanel
                    embedded
                    scene={selectedScene}
                    sceneIndex={selectedSceneIndex}
                    doc={doc}
                    projectId={project.id}
                    postId={post.id}
                    onDocChange={commit}
                    generateSoundEffect={generateSceneSoundEffect}
                  />
                  <CollapsibleSection
                    title="Captions"
                    defaultOpen={Boolean(doc.captions)}
                    summary={<span>{doc.captions ? "Generated" : "Not generated"}</span>}
                  >
                    {capError ? <p className="text-xs text-red-400">{capError}</p> : null}
                    <button
                      type="button"
                      className={`${btnPrimary} w-full`}
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
                      {capBusy ? "Generating…" : doc.captions ? "Regenerate captions" : "Generate captions"}
                    </button>
                  </CollapsibleSection>
                </InspectorPanel>
              </>
            ) : (
              <p className="pt-3 text-xs opacity-40">Select a scene to edit.</p>
            )}
          </aside>
        ) : (
          <div className="border-t border-white/10 p-2 lg:border-l lg:border-t-0">
            <IconButton label="Show inspector" onClick={() => setRightOpen(true)}>
              ‹
            </IconButton>
          </div>
        )}
      </div>

      {showAudioTimeline ? (
        <footer className="border-t border-white/10 p-4">
          <ReelAudioTimeline doc={doc} />
          <div className="mt-2 flex h-10 overflow-hidden rounded border border-white/10">
            {doc.scenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                aria-label={`Go to scene at ${(scene.durationMs / 1000).toFixed(1)} seconds`}
                className="h-full border-r border-white/10 bg-white/5 text-[10px] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7ecb88]"
                style={{ flex: scene.durationMs }}
                onClick={() => {
                  selectScene(scene.id);
                  setCurrentMs(scene.startMs);
                }}
              >
                {(scene.durationMs / 1000).toFixed(1)}s
              </button>
            ))}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
