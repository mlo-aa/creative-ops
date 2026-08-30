import type { ProjectCreativeContext } from "@/core/design/creativeContext";
import type { GenerateStoryboardBrief } from "@/core/video/generation/provider";
import { CLAUDE_STORYBOARD_JSON_SCHEMA } from "./claude-schema";

const FREEDOM_GUIDANCE: Record<GenerateStoryboardBrief["creativeFreedom"], string> = {
  low: "Closely follow project brand, strategy, and approved assets. Conservative layouts. Minimal experimental copy.",
  medium: "Stay brand-consistent but explore varied layouts, pacing, and hooks. Use project context creatively.",
  high: "More experimental layouts and copy while respecting brand restrictions, words-to-avoid, and core colors.",
};

export function buildStoryboardSystemPrompt(): string {
  return `You are a senior creative director generating editable vertical reel storyboards for Creative Ops.

Return ONLY valid JSON matching this schema — no markdown outside a single JSON object, no React, no code:
${CLAUDE_STORYBOARD_JSON_SCHEMA}

Rules:
- Canvas: 1080×1920 (9:16 vertical reel)
- Use 4–6 scenes for a ~15s reel; scale scene count with total duration
- Scene durationMs values MUST sum to the requested total duration (±5%)
- Each scene needs: durationMs, script (voiceover line), elements (on-screen copy + visuals)
- Prefer existing project assetId and logoId from context — NEVER invent fake URLs
- If no suitable image asset, use color backgrounds from brand colors
- On-screen text: short, punchy, readable on mobile
- voiceoverScript: combined narration for the full reel, caption-friendly phrasing
- animationIn: one of fade, fade-up, fade-down, slide-left, slide-right, scale-in, none
- Use brand colorId references where possible (e.g. "navy", "teal")
- Reference images inform visual direction only — do not copy competitor content literally`;
}

export function buildStoryboardUserPrompt(
  brief: GenerateStoryboardBrief,
  context: ProjectCreativeContext,
): string {
  const campaign = brief.campaignId
    ? context.campaigns.find((c) => c.id === brief.campaignId)
    : undefined;

  const selectedPosts = brief.referencePostIds?.length
    ? context.existingPosts.filter((p) => brief.referencePostIds!.includes(p.id))
    : [];

  const selectedInspiration = brief.inspirationIds?.length
    ? context.inspiration.filter((i) => brief.inspirationIds!.includes(i.id))
    : context.inspiration.slice(0, 3);

  return JSON.stringify(
    {
      brief: brief.brief,
      title: brief.title,
      platform: brief.platform,
      format: brief.format,
      style: brief.style ?? "editorial",
      durationMs: brief.durationMs,
      creativeFreedom: brief.creativeFreedom,
      creativeFreedomGuidance: FREEDOM_GUIDANCE[brief.creativeFreedom],
      generateCaptions: brief.generateCaptions ?? false,
      project: {
        id: context.projectId,
        name: context.projectName,
        clientName: context.clientName,
      },
      brand: context.brand,
      strategy: context.strategy,
      creativeDirection: context.creativeDirection,
      restrictions: context.restrictions,
      campaign: campaign ?? null,
      availableAssets: context.assets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        tags: a.tags,
        src: a.src.startsWith("http") ? a.src : "(local project asset)",
      })),
      references: context.references.slice(0, 5),
      inspiration: selectedInspiration,
      referenceDesigns: selectedPosts,
      contentItems: context.contentItems.slice(0, 5),
    },
    null,
    2,
  );
}

/** Up to 4 reference images for multimodal Claude input (http/https only). */
export function collectReferenceImageUrls(
  context: ProjectCreativeContext,
  baseUrl?: string,
): string[] {
  const urls: string[] = [];
  const add = (src: string | undefined) => {
    if (!src || urls.length >= 4) return;
    if (src.startsWith("http://") || src.startsWith("https://")) {
      if (!urls.includes(src)) urls.push(src);
      return;
    }
    if (src.startsWith("/") && baseUrl) {
      const abs = `${baseUrl.replace(/\/$/, "")}${src}`;
      if (!urls.includes(abs)) urls.push(abs);
    }
  };

  for (const asset of context.assets) {
    if (["photography", "backgrounds", "screenshots", "references"].includes(asset.category)) {
      add(asset.src);
    }
  }
  for (const insp of context.inspiration) add(insp.imageSrc);
  for (const logo of context.brand.logos) add(logo.src);

  return urls.slice(0, 4);
}

export function buildRepairPrompt(errors: string, previousJson: string): string {
  return `The previous JSON failed validation:
${errors}

Fix the JSON to satisfy all constraints. Return ONLY the corrected JSON object, no explanation.

Previous JSON:
${previousJson}`;
}
