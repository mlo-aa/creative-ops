import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { uploadToStorage } from "@/core/repositories/assets";
import { estimateMp3DurationMs } from "@/core/video/voiceover";
import { parseElevenLabsError } from "@/core/video/audio/elevenlabs-errors";
import type { ElevenLabsTTSProvider, TTSGenerateRequest } from "@/core/video/audio/providers";
import { reelVoiceoverPath } from "@/core/video/audio/storage-paths";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  return Buffer.from(await new Response(stream as BodyInit).arrayBuffer());
}

export class ServerElevenLabsTTSProvider implements ElevenLabsTTSProvider {
  constructor(private apiKey: string) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async generateVoiceover(request: TTSGenerateRequest) {
    const modelId = request.modelId?.trim() || DEFAULT_MODEL;
    const characterCount = request.text.length;
    const client = new ElevenLabsClient({ apiKey: this.apiKey });

    let buffer: Buffer;
    try {
      const audioStream = await client.textToSpeech.convert(request.voiceId, {
        text: request.text,
        modelId,
        outputFormat: "mp3_44100_128",
      });
      buffer = await streamToBuffer(audioStream);
    } catch (err) {
      throw parseElevenLabsError(err);
    }

    const durationMs = estimateMp3DurationMs(buffer, 128);
    const storagePath = reelVoiceoverPath(request.projectId, request.reelId);
    const assetId = `reel-${request.reelId}-voice`;

    const admin = getSupabaseAdmin();
    if (!admin) throw { message: "Supabase not configured", code: "SUPABASE_NOT_CONFIGURED" as const };

    let publicUrl: string;
    try {
      ({ publicUrl } = await uploadToStorage("project-assets", storagePath, buffer, "audio/mpeg"));
    } catch (uploadErr) {
      throw {
        message: uploadErr instanceof Error ? uploadErr.message : "Supabase upload failed",
        code: "SUPABASE_UPLOAD_FAILED" as const,
      };
    }

    return {
      assetUrl: publicUrl,
      storagePath,
      assetId,
      voiceId: request.voiceId,
      provider: "elevenlabs",
      model: modelId,
      characterCount,
      durationMs,
      metadata: { characterCount, durationMs },
    };
  }
}

export function createElevenLabsTTSProvider(): ElevenLabsTTSProvider | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  return new ServerElevenLabsTTSProvider(apiKey);
}
