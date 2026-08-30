/** ElevenLabs audio provider interfaces — server-side only. */

export type TTSGenerateRequest = {
  text: string;
  voiceId: string;
  modelId?: string;
  projectId: string;
  reelId: string;
};

export type MusicGenerateRequest = {
  prompt: string;
  durationMs: number;
  projectId: string;
  reelId: string;
};

export type SfxGenerateRequest = {
  prompt: string;
  durationMs: number;
  projectId: string;
  reelId: string;
  sfxId: string;
};

export type AudioGenerateResult = {
  assetUrl: string;
  storagePath: string;
  assetId: string;
  durationMs: number;
  provider: string;
  model: string;
  metadata?: Record<string, unknown>;
};

export interface ElevenLabsTTSProvider {
  generateVoiceover(request: TTSGenerateRequest): Promise<AudioGenerateResult & { voiceId: string; characterCount: number }>;
  isAvailable(): boolean;
}

export interface ElevenLabsMusicProvider {
  generateMusic(request: MusicGenerateRequest): Promise<AudioGenerateResult>;
  isAvailable(): boolean;
}

export interface ElevenLabsSoundEffectsProvider {
  generateSoundEffect(request: SfxGenerateRequest): Promise<AudioGenerateResult>;
  isAvailable(): boolean;
}
