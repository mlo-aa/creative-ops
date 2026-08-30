import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import type { VideoDocument } from "@/core/video/document";
import type { VideoRenderProvider, VideoRenderResult } from "@/core/video/render/provider";
import { canRenderOnPlatform } from "@/core/video/render/provider";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { uploadToStorage } from "@/core/repositories/assets";

export class LocalVideoRenderProvider implements VideoRenderProvider {
  async renderMp4(document: VideoDocument, projectId: string, postId: string): Promise<VideoRenderResult> {
    if (!canRenderOnPlatform()) {
      return {
        ok: false,
        requiresWorker: true,
        errorMessage:
          "MP4 rendering is not available on this platform. Run locally with VIDEO_RENDER_ENABLED=true or use a dedicated render worker.",
      };
    }

    try {
      const { bundle } = await import("@remotion/bundler");
      const { renderMedia, selectComposition } = await import("@remotion/renderer");

      const entry = path.join(process.cwd(), "core/video/remotion/entry.tsx");
      const serveUrl = await bundle({ entryPoint: entry });
      const inputProps = { document };

      const composition = await selectComposition({
        serveUrl,
        id: "VideoDocument",
        inputProps,
      });

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "reel-render-"));
      const outputPath = path.join(tmpDir, `${postId}.mp4`);

      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation: outputPath,
        inputProps,
      });

      const buffer = await fs.readFile(outputPath);
      const storagePath = `${projectId}/exports/${postId}-${Date.now()}.mp4`;
      const admin = getSupabaseAdmin();
      if (!admin) {
        return { ok: false, errorMessage: "Supabase admin not configured for export upload" };
      }

      const { publicUrl } = await uploadToStorage("exports", storagePath, buffer, "video/mp4");
      await fs.rm(tmpDir, { recursive: true, force: true });

      return { ok: true, publicUrl, storagePath, bytes: buffer.length };
    } catch (err) {
      return {
        ok: false,
        errorMessage: err instanceof Error ? err.message : "Local render failed",
      };
    }
  }
}

export const localVideoRenderProvider = new LocalVideoRenderProvider();
