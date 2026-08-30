import type { BrandProfile } from "@/core/types";
import type { VideoDocument, VideoScene, VideoTextProps } from "@/core/video/document";
import { buildSuggestedClipPrompt } from "@/core/video/clip/prompt";
import { formatDurationMs } from "@/core/video/voiceover";

export type StoryboardSceneExport = {
  sceneNumber: number;
  sceneId: string;
  startMs: number;
  startTime: string;
  durationMs: number;
  duration: string;
  script: string;
  visualDirection: string;
  suggestedShot: string;
  onScreenText: string[];
  transitionIn: string;
  transitionOut: string;
  assetSuggestions: string[];
  aiVideoPrompt: string;
  notes: string;
};

function formatTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const frames = Math.floor(((ms % 1000) / 1000) * 30);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

function onScreenTextForScene(scene: VideoScene): string[] {
  return scene.elements
    .filter((el) => el.type === "text")
    .map((el) => (el.props as VideoTextProps).content?.trim())
    .filter(Boolean) as string[];
}

function assetSuggestionsForScene(scene: VideoScene): string[] {
  const refs: string[] = [];
  if (scene.background?.type === "image" && scene.background.value) {
    refs.push(`Background image: ${scene.background.value}`);
  }
  if (scene.background?.type === "video") {
    const url = scene.background.videoClip?.assetUrl ?? scene.background.value;
    if (url) refs.push(`Video background: ${url}`);
  }
  for (const el of scene.elements) {
    if (el.type === "image" && "src" in el.props && el.props.src) {
      refs.push(`Image element "${el.name}": ${el.props.src}`);
    }
    if (el.type === "logo" && "src" in el.props && el.props.src) {
      refs.push(`Logo "${el.name}": ${el.props.src}`);
    }
  }
  return refs;
}

export function buildStoryboardExport(
  doc: VideoDocument,
  brand: BrandProfile,
): { title: string; scenes: StoryboardSceneExport[] } {
  const scenes = doc.scenes.map((scene, index) => {
    const visualDirection = scene.visualDirection?.trim() ?? "";
    const suggestedShot =
      visualDirection ||
      (scene.background?.type === "video"
        ? "Use generated or uploaded video b-roll"
        : scene.background?.type === "image"
          ? "Static image background with subtle motion in edit"
          : "Brand-color card with kinetic typography");

    return {
      sceneNumber: index + 1,
      sceneId: scene.id,
      startMs: scene.startMs,
      startTime: formatTimecode(scene.startMs),
      durationMs: scene.durationMs,
      duration: formatDurationMs(scene.durationMs),
      script: scene.script?.trim() ?? "",
      visualDirection,
      suggestedShot,
      onScreenText: onScreenTextForScene(scene),
      transitionIn: scene.transitionIn?.type ?? "none",
      transitionOut: scene.transitionOut?.type ?? "none",
      assetSuggestions: assetSuggestionsForScene(scene),
      aiVideoPrompt:
        scene.background?.videoClip?.generationPrompt ??
        buildSuggestedClipPrompt({ scene, brand, metadata: doc.metadata }),
      notes: "",
    };
  });

  return { title: doc.title, scenes };
}

export function storyboardToJson(doc: VideoDocument, brand: BrandProfile, projectName: string) {
  const board = buildStoryboardExport(doc, brand);
  return {
    project: projectName,
    reelId: doc.id,
    title: doc.title,
    aspectRatio: "9:16",
    fps: doc.fps,
    totalDurationMs: doc.durationMs,
    metadata: doc.metadata,
    scenes: board.scenes,
    exportedAt: new Date().toISOString(),
  };
}

export function storyboardToMarkdown(doc: VideoDocument, brand: BrandProfile, projectName: string): string {
  const board = buildStoryboardExport(doc, brand);
  const lines: string[] = [
    `# ${doc.title} — Storyboard`,
    "",
    `**Project:** ${projectName}`,
    `**Format:** 9:16 reel · ${doc.fps} fps · ${formatDurationMs(doc.durationMs)} total`,
    "",
  ];

  if (doc.metadata.brief) lines.push(`**Brief:** ${doc.metadata.brief}`, "");
  if (doc.metadata.style) lines.push(`**Style:** ${doc.metadata.style}`, "");
  if (doc.metadata.platform) lines.push(`**Platform:** ${doc.metadata.platform}`, "");

  for (const scene of board.scenes) {
    lines.push(
      `## Scene ${scene.sceneNumber} — ${scene.startTime} (${scene.duration})`,
      "",
      scene.script ? `**Script:** ${scene.script}` : "**Script:** _(empty)_",
      "",
      scene.visualDirection
        ? `**Visual direction:** ${scene.visualDirection}`
        : "**Visual direction:** _(not set)_",
      "",
      `**Suggested shot:** ${scene.suggestedShot}`,
      "",
    );

    if (scene.onScreenText.length) {
      lines.push("**On-screen text:**");
      for (const t of scene.onScreenText) lines.push(`- ${t}`);
      lines.push("");
    }

    lines.push(
      `**Transition in:** ${scene.transitionIn} · **Transition out:** ${scene.transitionOut}`,
      "",
      "**AI video prompt:**",
      "```",
      scene.aiVideoPrompt,
      "```",
      "",
    );

    if (scene.assetSuggestions.length) {
      lines.push("**Asset / reference suggestions:**");
      for (const a of scene.assetSuggestions) lines.push(`- ${a}`);
      lines.push("");
    }

    if (scene.notes) {
      lines.push(`**Notes:** ${scene.notes}`, "");
    }

    lines.push("---", "");
  }

  return lines.join("\n").trim() + "\n";
}

export function videoPromptsMarkdown(doc: VideoDocument, brand: BrandProfile): string {
  const board = buildStoryboardExport(doc, brand);
  const lines = ["# Video clip prompts", ""];
  for (const scene of board.scenes) {
    lines.push(`## Scene ${scene.sceneNumber}`, "", scene.aiVideoPrompt, "", "---", "");
  }
  return lines.join("\n").trim() + "\n";
}

function formatTimecodeShort(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function soundEffectsMarkdown(doc: VideoDocument): string {
  const lines = ["# Sound effects", ""];
  const sfx = doc.soundEffects ?? [];
  if (!sfx.length) {
    lines.push("_No sound effects generated yet._");
    return lines.join("\n") + "\n";
  }
  for (const effect of sfx) {
    const sceneIndex = doc.scenes.findIndex((s) => s.id === effect.sceneId);
    lines.push(
      `## Scene ${sceneIndex >= 0 ? sceneIndex + 1 : "?"} — ${effect.prompt}`,
      "",
      `- Start: ${formatTimecodeShort(effect.startMs)}`,
      `- Duration: ${formatDurationMs(effect.durationMs)}`,
      `- Status: ${effect.status}`,
      effect.assetUrl ? `- File: ${effect.assetUrl}` : "",
      "",
      "---",
      "",
    );
  }
  return lines.join("\n").trim() + "\n";
}
