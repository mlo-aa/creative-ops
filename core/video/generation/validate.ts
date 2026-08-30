import type { ProjectCreativeContext } from "@/core/design/creativeContext";
import type { GenerateStoryboardBrief } from "@/core/video/generation/provider";
import {
  REEL_FPS,
  REEL_HEIGHT,
  REEL_WIDTH,
  syncVideoDuration,
  uid,
  type VideoAnimationType,
  type VideoDocument,
  type VideoElement,
  type VideoScene,
} from "@/core/video/document";
import { applyScriptToDocument } from "@/core/video/script";
import { attachCaptionsToDocument } from "@/core/video/captions";
import type { BrandProfile } from "@/core/types";
import type { ClaudeStoryboardElement, ClaudeStoryboardOutput, ClaudeStoryboardScene } from "./claude-schema";

const ANIMATIONS = new Set<VideoAnimationType>([
  "fade",
  "fade-up",
  "fade-down",
  "slide-left",
  "slide-right",
  "scale-in",
  "none",
]);

const ELEMENT_TYPES = new Set(["text", "image", "logo", "rectangle", "circle", "line", "group"]);

export type ValidationError = { path: string; message: string };

export function extractJsonFromResponse(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export function parseClaudeStoryboardJson(raw: string): { data?: unknown; error?: string } {
  try {
    return { data: JSON.parse(extractJsonFromResponse(raw)) };
  } catch {
    return { error: "Response is not valid JSON" };
  }
}

function sceneCountForDuration(durationMs: number, freedom: GenerateStoryboardBrief["creativeFreedom"]): {
  min: number;
  max: number;
} {
  if (durationMs <= 10_000) return freedom === "high" ? { min: 3, max: 5 } : { min: 3, max: 4 };
  if (durationMs <= 15_000) return freedom === "high" ? { min: 5, max: 6 } : freedom === "low" ? { min: 4, max: 5 } : { min: 4, max: 6 };
  return freedom === "high" ? { min: 5, max: 7 } : { min: 4, max: 6 };
}

export function validateClaudeStoryboard(
  data: unknown,
  brief: GenerateStoryboardBrief,
): { ok: true; output: ClaudeStoryboardOutput } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!data || typeof data !== "object") {
    return { ok: false, errors: [{ path: "root", message: "Expected JSON object" }] };
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== "string" || !obj.title.trim()) {
    errors.push({ path: "title", message: "title must be a non-empty string" });
  }
  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    errors.push({ path: "scenes", message: "scenes must be a non-empty array" });
    return { ok: false, errors };
  }

  const { min, max } = sceneCountForDuration(brief.durationMs, brief.creativeFreedom);
  if (obj.scenes.length < min || obj.scenes.length > max) {
    errors.push({
      path: "scenes",
      message: `expected ${min}–${max} scenes for ${brief.durationMs}ms reel, got ${obj.scenes.length}`,
    });
  }

  let totalDuration = 0;
  obj.scenes.forEach((scene, i) => {
    if (!scene || typeof scene !== "object") {
      errors.push({ path: `scenes[${i}]`, message: "scene must be an object" });
      return;
    }
    const s = scene as Record<string, unknown>;
    if (typeof s.durationMs !== "number" || s.durationMs < 500) {
      errors.push({ path: `scenes[${i}].durationMs`, message: "durationMs must be >= 500" });
    } else {
      totalDuration += s.durationMs;
    }
    if (typeof s.script !== "string" || !s.script.trim()) {
      errors.push({ path: `scenes[${i}].script`, message: "script must be a non-empty string" });
    }
    if (!Array.isArray(s.elements)) {
      errors.push({ path: `scenes[${i}].elements`, message: "elements must be an array" });
    } else {
      s.elements.forEach((el, j) => {
        if (!el || typeof el !== "object") {
          errors.push({ path: `scenes[${i}].elements[${j}]`, message: "element must be an object" });
          return;
        }
        const e = el as Record<string, unknown>;
        if (typeof e.type !== "string" || !ELEMENT_TYPES.has(e.type)) {
          errors.push({ path: `scenes[${i}].elements[${j}].type`, message: "invalid element type" });
        }
        if (typeof e.name !== "string") {
          errors.push({ path: `scenes[${i}].elements[${j}].name`, message: "name required" });
        }
        for (const key of ["x", "y", "width", "height"] as const) {
          if (typeof e[key] !== "number") {
            errors.push({ path: `scenes[${i}].elements[${j}].${key}`, message: `${key} must be a number` });
          }
        }
        if (e.type === "text" && (typeof e.content !== "string" || !String(e.content).trim())) {
          errors.push({ path: `scenes[${i}].elements[${j}].content`, message: "text elements need content" });
        }
      });
    }
  });

  const tolerance = Math.max(500, brief.durationMs * 0.08);
  if (Math.abs(totalDuration - brief.durationMs) > tolerance) {
    errors.push({
      path: "scenes.durationMs",
      message: `scene durations sum to ${totalDuration}ms, expected ~${brief.durationMs}ms (±${Math.round(tolerance)}ms)`,
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, output: obj as unknown as ClaudeStoryboardOutput };
}

function resolveColor(
  color: string | undefined,
  colorId: string | undefined,
  context: ProjectCreativeContext,
  fallback: string,
): string {
  if (colorId) {
    const c = context.brand.colors.find((x) => x.id === colorId);
    if (c) return c.hex;
  }
  if (color?.startsWith("#")) return color;
  if (color) {
    const byId = context.brand.colors.find((x) => x.id === color);
    if (byId) return byId.hex;
  }
  return fallback;
}

function resolveBackground(
  bg: ClaudeStoryboardScene["background"] | undefined,
  context: ProjectCreativeContext,
): VideoScene["background"] {
  const defaultHex = context.brand.colors.find((c) => c.id === context.brand.defaultBackground)?.hex
    ?? context.brand.colors[0]?.hex
    ?? "#171717";

  if (!bg) return { type: "color", value: defaultHex };

  if (bg.type === "image" && bg.assetId) {
    const asset = context.assets.find((a) => a.id === bg.assetId);
    if (asset?.src) return { type: "image", value: asset.src, assetId: asset.id };
  }

  const hex = resolveColor(bg.value, bg.colorId, context, defaultHex);
  return { type: "color", value: hex };
}

function toVideoElement(
  el: ClaudeStoryboardElement,
  sceneDurationMs: number,
  context: ProjectCreativeContext,
): VideoElement | null {
  const anim = el.animationIn && ANIMATIONS.has(el.animationIn) ? el.animationIn : "fade-up";
  const base = {
    id: uid("el"),
    type: el.type,
    name: el.name,
    x: Math.round(el.x),
    y: Math.round(el.y),
    width: Math.round(el.width),
    height: Math.round(el.height),
    opacity: el.opacity ?? 1,
    rotation: 0,
    zIndex: el.zIndex ?? 2,
    startOffsetMs: 200,
    durationMs: Math.max(400, sceneDurationMs - 400),
    animationIn: { type: anim, durationMs: 500 },
    animationOut: { type: "fade" as const, durationMs: 300 },
  };

  const textColor = resolveColor(el.color, el.colorId, context, context.brand.defaultText);

  if (el.type === "text") {
    return {
      ...base,
      props: {
        content: el.content ?? "",
        fontSize: el.fontSize ?? 64,
        fontWeight: 700,
        color: textColor,
        align: el.align ?? "center",
      },
    };
  }

  if (el.type === "image" && el.assetId) {
    const asset = context.assets.find((a) => a.id === el.assetId);
    if (!asset?.src) return null;
    return {
      ...base,
      zIndex: el.zIndex ?? 0,
      startOffsetMs: 0,
      durationMs: sceneDurationMs,
      props: { src: asset.src, assetId: asset.id, objectFit: el.objectFit ?? "cover" },
    };
  }

  if (el.type === "logo" && el.logoId) {
    const logo = context.brand.logos.find((l) => l.id === el.logoId);
    if (!logo?.src) return null;
    return {
      ...base,
      zIndex: el.zIndex ?? 3,
      props: { logoId: logo.id, src: logo.src, mode: "isotipo" },
    };
  }

  if (el.type === "rectangle" || el.type === "circle") {
    const fill = resolveColor(el.fill, el.fillColorId, context, context.brand.defaultAccent);
    return {
      ...base,
      zIndex: el.zIndex ?? 1,
      props: { fill, cornerRadius: el.type === "circle" ? undefined : 0 },
    };
  }

  return null;
}

export function claudeOutputToVideoDocument(
  output: ClaudeStoryboardOutput,
  brief: GenerateStoryboardBrief,
  context: ProjectCreativeContext,
  options?: { voiceId?: string; modelId?: string; generatedBy?: "mock" | "claude" },
): VideoDocument {
  const scenes: VideoScene[] = output.scenes.map((scene) => {
    const elements = scene.elements
      .map((el) => toVideoElement(el, scene.durationMs, context))
      .filter((e): e is VideoElement => Boolean(e));

    if (elements.length === 0) {
      elements.push({
        id: uid("el"),
        type: "text",
        name: "Headline",
        x: 80,
        y: 800,
        width: 920,
        height: 200,
        opacity: 1,
        rotation: 0,
        zIndex: 2,
        startOffsetMs: 200,
        durationMs: scene.durationMs - 400,
        animationIn: { type: "fade-up", durationMs: 500 },
        props: {
          content: scene.script.slice(0, 80),
          fontSize: 56,
          fontWeight: 700,
          color: context.brand.defaultText,
          align: "center",
        },
      });
    }

    return {
      id: uid("scene"),
      startMs: 0,
      durationMs: scene.durationMs,
      script: scene.script,
      background: resolveBackground(scene.background, context),
      elements,
      transitionIn: { type: "fade", durationMs: 350 },
      transitionOut: { type: "fade", durationMs: 300 },
    };
  });

  let doc: VideoDocument = syncVideoDuration({
    schemaVersion: 1,
    id: uid("reel"),
    projectId: context.projectId,
    title: brief.title ?? output.title,
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    fps: REEL_FPS,
    durationMs: brief.durationMs,
    scenes,
    metadata: {
      brief: brief.brief,
      platform: brief.platform,
      format: brief.format,
      style: brief.style,
      campaignId: brief.campaignId,
      generatedBy: options?.generatedBy ?? "claude",
      creativeFreedom: brief.creativeFreedom,
      generateCaptions: brief.generateCaptions,
      voiceId: options?.voiceId,
      modelId: options?.modelId,
    },
  });

  doc = applyScriptToDocument(doc);

  if (brief.generateCaptions) {
    doc = attachCaptionsToDocument(doc, brandProfileFromContext(context));
  }

  return doc;
}

function brandProfileFromContext(context: ProjectCreativeContext): BrandProfile {
  return {
    name: context.brand.name,
    shortName: context.brand.name,
    description: context.brand.description,
    tagline: context.brand.tagline,
    website: "",
    colors: context.brand.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
    logos: context.brand.logos.map((l) => ({
      id: l.id,
      name: l.name,
      src: l.src,
      role: "primary" as const,
    })),
    fonts: {
      primary: context.brand.fonts.primary ?? "Inter",
      secondary: context.brand.fonts.secondary ?? "Inter",
      display: context.brand.fonts.display ?? "Inter",
      body: context.brand.fonts.body ?? "Inter",
    },
    defaultBackground: context.brand.defaultBackground,
    defaultText: context.brand.defaultText,
    defaultAccent: context.brand.defaultAccent,
  };
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `${e.path}: ${e.message}`).join("; ");
}

export function resolveStoryboardProvider(): "claude" | "mock" | "unconfigured" {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "claude";
  if (process.env.NODE_ENV === "production") return "unconfigured";
  return "mock";
}

export function getDefaultClaudeVideoModel(): string {
  return process.env.ANTHROPIC_VIDEO_MODEL?.trim() || "claude-sonnet-4-20250514";
}
