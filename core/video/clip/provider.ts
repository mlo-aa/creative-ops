/** AI video clip generation — provider abstraction (no paid APIs wired yet). */

export type VideoClipAspectRatio = "9:16" | "16:9" | "1:1";

export type GenerateClipRequest = {
  prompt: string;
  durationMs: number;
  aspectRatio: VideoClipAspectRatio;
  referenceImages?: string[];
  projectId: string;
  sceneId: string;
};

export type GenerateClipResult = {
  ok: boolean;
  assetUrl?: string;
  assetId?: string;
  durationMs?: number;
  provider?: string;
  model?: string;
  error?: string;
};

export interface VideoClipGenerationProvider {
  generateClip(request: GenerateClipRequest): Promise<GenerateClipResult>;
  isAvailable(): boolean;
  getProviderLabel(): string;
}

/** Generated clips upload to Supabase `project-assets` under this prefix. */
export function videoClipStoragePath(projectId: string, assetId: string): string {
  return `${projectId}/video-clips/${assetId}.mp4`;
}

export const CLIP_GENERATION_UNAVAILABLE =
  "AI video generation is not connected yet.";

export class DisabledVideoClipGenerationProvider implements VideoClipGenerationProvider {
  getProviderLabel(): string {
    return "disabled";
  }

  isAvailable(): boolean {
    return false;
  }

  async generateClip(_request: GenerateClipRequest): Promise<GenerateClipResult> {
    return {
      ok: false,
      provider: "disabled",
      error: CLIP_GENERATION_UNAVAILABLE,
    };
  }
}

export const disabledVideoClipProvider = new DisabledVideoClipGenerationProvider();
