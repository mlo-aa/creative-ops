import { formatElevenLabsUiMessage } from "@/core/video/audio/elevenlabs-errors";

export function throwAudioApiError(data: { error?: string; code?: string }): never {
  throw new Error(formatElevenLabsUiMessage(data.code, data.error));
}

export async function parseAudioApiResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string; code?: string };
  if (!res.ok) throwAudioApiError(data);
  return data;
}
