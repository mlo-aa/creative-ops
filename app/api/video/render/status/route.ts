import { NextResponse } from "next/server";
import { canRenderOnPlatform } from "@/core/video/render/provider";

export const runtime = "nodejs";

export async function GET() {
  const available = canRenderOnPlatform();
  return NextResponse.json({
    available,
    requiresWorker: !available,
    message: available
      ? "Local MP4 rendering is available on this server."
      : "Production rendering requires a render worker. MP4 export is not available on Vercel serverless.",
  });
}
