import { NextRequest, NextResponse } from "next/server";
import type { VideoDocument } from "@/core/video/document";
import { canRenderOnPlatform } from "@/core/video/render/provider";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let body: { document?: VideoDocument; projectId?: string; postId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, errorMessage: "Invalid JSON" }, { status: 400 });
  }

  const { document: doc, projectId, postId } = body;
  if (!doc || !projectId || !postId) {
    return NextResponse.json({ ok: false, errorMessage: "Missing document, projectId, or postId" }, { status: 400 });
  }

  if (!canRenderOnPlatform()) {
    return NextResponse.json({
      ok: false,
      requiresWorker: true,
      errorMessage:
        "MP4 export is not supported on Vercel serverless. Use local dev (VIDEO_RENDER_ENABLED=true) or a dedicated Remotion render worker.",
    });
  }

  const { localVideoRenderProvider } = await import("@/core/video/render/local-provider");
  const result = await localVideoRenderProvider.renderMp4(doc, projectId, postId);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
