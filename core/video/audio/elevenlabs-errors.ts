export type ElevenLabsErrorCode =
  | "ELEVENLABS_NOT_CONFIGURED"
  | "SUPABASE_NOT_CONFIGURED"
  | "SUPABASE_UPLOAD_FAILED"
  | "ELEVENLABS_API_ERROR"
  | "ELEVENLABS_CREDITS"
  | "ELEVENLABS_PLAN_RESTRICTED";

export function parseElevenLabsError(err: unknown): { message: string; code: ElevenLabsErrorCode } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes("quota") || lower.includes("credit") || lower.includes("insufficient")) {
    return {
      message: "ElevenLabs credits are insufficient for this generation. Check your plan or billing.",
      code: "ELEVENLABS_CREDITS",
    };
  }
  if (
    lower.includes("subscription") ||
    lower.includes("plan") ||
    lower.includes("not available") ||
    lower.includes("forbidden") ||
    lower.includes("403")
  ) {
    return {
      message: "This ElevenLabs feature is not available on your current plan.",
      code: "ELEVENLABS_PLAN_RESTRICTED",
    };
  }

  return { message: raw || "ElevenLabs API request failed.", code: "ELEVENLABS_API_ERROR" };
}

export function formatElevenLabsUiMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case "ELEVENLABS_NOT_CONFIGURED":
      return "ElevenLabs is not configured. Add ELEVENLABS_API_KEY to .env.local (server-only).";
    case "SUPABASE_NOT_CONFIGURED":
      return "Supabase is not configured. Audio cannot be stored.";
    case "SUPABASE_UPLOAD_FAILED":
      return fallback ?? "Audio was generated but Supabase upload failed.";
    case "ELEVENLABS_CREDITS":
      return "ElevenLabs credits are insufficient for this generation.";
    case "ELEVENLABS_PLAN_RESTRICTED":
      return "This ElevenLabs feature is not available on your current plan.";
    case "ELEVENLABS_API_ERROR":
      return fallback ?? "ElevenLabs API request failed.";
    default:
      return fallback ?? "Audio generation failed.";
  }
}
