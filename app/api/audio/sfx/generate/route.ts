import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatElevenLabsUiMessage } from "@/core/video/audio/elevenlabs-errors";
import { createElevenLabsSoundEffectsProvider } from "@/core/video/audio/elevenlabs-sfx-provider";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const provider = createElevenLabsSoundEffectsProvider();
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

  let body: {
    prompt?: string;
    durationMs?: number;
    projectId?: string;
    reelId?: string;
    sfxId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const projectId = body.projectId?.trim();
  const reelId = body.reelId?.trim();
  const sfxId = body.sfxId?.trim() ?? `sfx-${Date.now()}`;
  const durationMs = body.durationMs ?? 2000;

  if (!prompt || !projectId || !reelId) {
    return NextResponse.json({ error: "Missing prompt, projectId, or reelId" }, { status: 400 });
  }

  try {
    const result = await provider.generateSoundEffect({
      prompt,
      durationMs,
      projectId,
      reelId,
      sfxId,
    });
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
    console.error("[audio/sfx/generate]", err);
    return NextResponse.json({ error: message, code }, { status: code === "SUPABASE_UPLOAD_FAILED" ? 502 : 500 });
  }
}
