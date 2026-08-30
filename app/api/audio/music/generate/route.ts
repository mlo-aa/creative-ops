import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatElevenLabsUiMessage } from "@/core/video/audio/elevenlabs-errors";
import { createElevenLabsMusicProvider } from "@/core/video/audio/elevenlabs-music-provider";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const provider = createElevenLabsMusicProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured", code: "ELEVENLABS_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (!getSupabaseAdmin()) {
    return NextResponse.json(
      { error: "Supabase not configured", code: "SUPABASE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let body: { prompt?: string; durationMs?: number; projectId?: string; reelId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const projectId = body.projectId?.trim();
  const reelId = body.reelId?.trim();
  const durationMs = body.durationMs ?? 15_000;

  if (!prompt || !projectId || !reelId) {
    return NextResponse.json({ error: "Missing prompt, projectId, or reelId" }, { status: 400 });
  }

  try {
    const result = await provider.generateMusic({ prompt, durationMs, projectId, reelId });
    return NextResponse.json(result);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "ELEVENLABS_API_ERROR";
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : formatElevenLabsUiMessage(code);
    console.error("[audio/music/generate]", err);
    return NextResponse.json({ error: message, code }, { status: code === "SUPABASE_UPLOAD_FAILED" ? 502 : 500 });
  }
}
