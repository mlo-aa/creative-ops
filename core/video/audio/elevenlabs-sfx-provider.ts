import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { uploadToStorage } from "@/core/repositories/assets";
import { estimateMp3DurationMs } from "@/core/video/voiceover";
import { parseElevenLabsError } from "@/core/video/audio/elevenlabs-errors";
import type { ElevenLabsSoundEffectsProvider, SfxGenerateRequest } from "@/core/video/audio/providers";
import { reelSfxPath } from "@/core/video/audio/storage-paths";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  return Buffer.from(await new Response(stream as BodyInit).arrayBuffer());
}

export class ServerElevenLabsSoundEffectsProvider implements ElevenLabsSoundEffectsProvider {
  constructor(private apiKey: string) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async generateSoundEffect(request: SfxGenerateRequest) {
    const durationSeconds = Math.min(Math.max(Math.round(request.durationMs / 1000), 0.5), 22);
    const client = new ElevenLabsClient({ apiKey: this.apiKey });

    let buffer: Buffer;
    try {
      const audioStream = await client.textToSoundEffects.convert({
        text: request.prompt,
        durationSeconds,
      });
      buffer = await streamToBuffer(audioStream);
    } catch (err) {
      throw parseElevenLabsError(err);
    }

    const durationMs = estimateMp3DurationMs(buffer, 128);
    const storagePath = reelSfxPath(request.projectId, request.reelId, request.sfxId);
    const assetId = request.sfxId;

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
      provider: "elevenlabs",
      model: "sound-effects",
      durationMs,
      metadata: { durationSeconds, prompt: request.prompt },
    };
  }
}

export function createElevenLabsSoundEffectsProvider(): ElevenLabsSoundEffectsProvider | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  return new ServerElevenLabsSoundEffectsProvider(apiKey);
}
