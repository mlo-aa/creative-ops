import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatElevenLabsUiMessage } from "@/core/video/audio/elevenlabs-errors";
import { createElevenLabsTTSProvider } from "@/core/video/audio/elevenlabs-tts-provider";
import {
  formatVoiceoverValidationError,
  validateVoiceoverScript,
} from "@/core/video/script-validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const provider = createElevenLabsTTSProvider();
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
    text?: string;
    voiceId?: string;
    modelId?: string;
    projectId?: string;
    reelId?: string;
    assetId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  const voiceId = body.voiceId?.trim();
  const projectId = body.projectId?.trim();
  const reelId = body.reelId?.trim() ?? body.assetId?.replace(/^vo-/, "") ?? `reel-${Date.now()}`;

  if (!text || !voiceId || !projectId) {
    return NextResponse.json({ error: "Missing text, voiceId, or projectId" }, { status: 400 });
  }

  const validation = validateVoiceoverScript(text);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: formatVoiceoverValidationError(validation),
        code: "VOICEOVER_SCRIPT_INVALID",
      },
      { status: 400 },
    );
  }

  try {
    const result = await provider.generateVoiceover({
      text,
      voiceId,
      modelId: body.modelId,
      projectId,
      reelId,
    });

    return NextResponse.json({
      assetUrl: result.assetUrl,
      storagePath: result.storagePath,
      assetId: result.assetId,
      voiceId: result.voiceId,
      modelId: result.model,
      characterCount: result.characterCount,
      durationMs: result.durationMs,
      provider: result.provider,
      metadata: result.metadata,
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "ELEVENLABS_API_ERROR";
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : formatElevenLabsUiMessage(code);
    console.error("[audio/generate]", err);
    return NextResponse.json({ error: message, code }, { status: code === "SUPABASE_UPLOAD_FAILED" ? 502 : 500 });
  }
}
