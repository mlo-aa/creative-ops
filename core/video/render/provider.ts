import type { VideoDocument } from "@/core/video/document";

export type VideoRenderResult = {
  ok: boolean;
  publicUrl?: string;
  storagePath?: string;
  bytes?: number;
  errorMessage?: string;
  requiresWorker?: boolean;
};

export interface VideoRenderProvider {
  renderMp4(document: VideoDocument, projectId: string, postId: string): Promise<VideoRenderResult>;
}

export function canRenderOnPlatform(): boolean {
  // Remotion bundler + ffmpeg cannot reliably run in Vercel serverless functions.
  if (process.env.VERCEL === "1") return false;
  return process.env.VIDEO_RENDER_ENABLED === "true" || process.env.NODE_ENV === "development";
}
