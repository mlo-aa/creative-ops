import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { uploadToStorage } from "@/core/repositories/assets";
import { estimateMp3DurationMs } from "@/core/video/voiceover";
import { parseElevenLabsError } from "@/core/video/audio/elevenlabs-errors";
import type { ElevenLabsMusicProvider, MusicGenerateRequest } from "@/core/video/audio/providers";
import { reelMusicPath } from "@/core/video/audio/storage-paths";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const DEFAULT_MUSIC_MODEL = process.env.ELEVENLABS_MUSIC_MODEL_ID ?? "music_v2";

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  return Buffer.from(await new Response(stream as BodyInit).arrayBuffer());
}

export class ServerElevenLabsMusicProvider implements ElevenLabsMusicProvider {
  constructor(private apiKey: string) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async generateMusic(request: MusicGenerateRequest) {
    const modelId = DEFAULT_MUSIC_MODEL;
    const musicLengthMs = Math.min(Math.max(request.durationMs, 3000), 600_000);
    const client = new ElevenLabsClient({ apiKey: this.apiKey });

    let buffer: Buffer;
    try {
      const audioStream = await client.music.compose({
        prompt: request.prompt,
        musicLengthMs,
        modelId: modelId as "music_v2",
        forceInstrumental: true,
      });
      buffer = await streamToBuffer(audioStream);
    } catch (err) {
      throw parseElevenLabsError(err);
    }

    const durationMs = estimateMp3DurationMs(buffer, 192);
    const storagePath = reelMusicPath(request.projectId, request.reelId);
    const assetId = `reel-${request.reelId}-music`;

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
      model: modelId,
      durationMs,
      metadata: { musicLengthMs, prompt: request.prompt },
    };
  }
}

export function createElevenLabsMusicProvider(): ElevenLabsMusicProvider | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  return new ServerElevenLabsMusicProvider(apiKey);
}
