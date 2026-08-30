import type { ProjectCreativeContext } from "@/core/design/creativeContext";
import type { CreativeFreedom } from "@/core/design/generation/provider";
import {
  REEL_FPS,
  REEL_HEIGHT,
  REEL_WIDTH,
  syncVideoDuration,
  uid,
  type VideoDocument,
} from "@/core/video/document";
import { applyScriptToDocument } from "@/core/video/script";
import { attachCaptionsToDocument } from "@/core/video/captions";
import { buildMockScenePlans, mockPlansToScenes } from "@/core/video/generation/mock-storyboard";

export type GenerateStoryboardBrief = {
  brief: string;
  platform: string;
  format: string;
  style?: string;
  durationMs: number;
  campaignId?: string;
  creativeFreedom: CreativeFreedom;
  generateCaptions?: boolean;
  referencePostIds?: string[];
  inspirationIds?: string[];
  title?: string;
};

export type GenerateStoryboardOptions = {
  voiceId?: string;
  modelId?: string;
};

export interface VideoGenerationProvider {
  generateStoryboard(
    brief: GenerateStoryboardBrief,
    context: ProjectCreativeContext,
    options?: GenerateStoryboardOptions,
  ): Promise<VideoDocument>;
}

export class MockVideoGenerationProvider implements VideoGenerationProvider {
  async generateStoryboard(
    brief: GenerateStoryboardBrief,
    context: ProjectCreativeContext,
    options?: GenerateStoryboardOptions,
  ): Promise<VideoDocument> {
    const plans = buildMockScenePlans(brief, context);
    const scenes = mockPlansToScenes(plans, brief, context);
    let doc: VideoDocument = syncVideoDuration({
      schemaVersion: 1,
      id: uid("reel"),
      projectId: context.projectId,
      title: brief.title ?? `${context.brand.name} Reel`,
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
        generatedBy: "mock",
        creativeFreedom: brief.creativeFreedom,
        generateCaptions: brief.generateCaptions,
        voiceId: options?.voiceId,
        modelId: options?.modelId,
      },
    });

    doc = applyScriptToDocument(doc);

    if (brief.generateCaptions) {
      doc = attachCaptionsToDocument(doc, {
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
          primary: "Inter",
          secondary: "Inter",
          display: "Inter",
          body: "Inter",
        },
        defaultBackground: context.brand.colors[0]?.hex ?? "#000",
        defaultText: "#fff",
        defaultAccent: context.brand.colors[1]?.hex ?? "#fff",
      });
    }

    return doc;
  }
}

export const videoGenerationProvider = new MockVideoGenerationProvider();
