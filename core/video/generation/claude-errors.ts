/** Detect Anthropic billing / credit / quota errors for dev mock fallback. */

import type { ProjectCreativeContext } from "@/core/design/creativeContext";
import type { VideoDocument } from "@/core/video/document";
import type { GenerateStoryboardBrief, GenerateStoryboardOptions } from "./provider";
import { MockVideoGenerationProvider } from "./provider";
import { ClaudeVideoGenerationProvider } from "./claude-provider";

const CREDIT_PATTERNS = [
  /credit balance is too low/i,
  /insufficient credits?/i,
  /billing/i,
  /payment required/i,
  /quota exceeded/i,
  /usage limit/i,
  /account balance/i,
  /purchase credits/i,
  /out of credits/i,
];

const QUOTA_STATUS_CODES = new Set([402, 429]);

export function isDevelopmentEnv(): boolean {
  return process.env.NODE_ENV !== "production";
}

function errorText(err: unknown): string {
  if (!err) return "";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const nested = obj.error;
    if (nested && typeof nested === "object") {
      const msg = (nested as Record<string, unknown>).message;
      if (typeof msg === "string") return msg;
    }
    if (typeof obj.message === "string") return obj.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

function errorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const obj = err as Record<string, unknown>;
  if (typeof obj.status === "number") return obj.status;
  return undefined;
}

export function isClaudeCreditOrQuotaError(err: unknown): boolean {
  const text = errorText(err);
  const status = errorStatus(err);

  if (status === 400 && CREDIT_PATTERNS.some((p) => p.test(text))) return true;
  if (status && QUOTA_STATUS_CODES.has(status) && CREDIT_PATTERNS.some((p) => p.test(text))) {
    return true;
  }
  return CREDIT_PATTERNS.some((p) => p.test(text));
}

export const CLAUDE_CREDITS_UNAVAILABLE_MESSAGE =
  "Claude is unavailable because the Anthropic account has no API credits. Using mock storyboard for development.";

export const MOCK_FALLBACK_LABEL = "Mock storyboard · Claude credits unavailable";

export function formatStoryboardError(err: unknown): string {
  if (isClaudeCreditOrQuotaError(err)) {
    return isDevelopmentEnv()
      ? CLAUDE_CREDITS_UNAVAILABLE_MESSAGE
      : "Claude is unavailable — the Anthropic account has insufficient API credits. Add credits or contact your administrator.";
  }

  const text = errorText(err);
  if (text.includes("invalid_request_error") || text.includes('"type"')) {
    return "Storyboard generation failed. Check your Anthropic API configuration and try again.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Storyboard generation failed";
}

export type StoryboardGenerationResult = {
  video: VideoDocument;
  provider: "claude" | "mock";
  model: string | null;
  mockReason?: string;
  fallbackFromClaude?: boolean;
  notice?: string;
};

export async function generateStoryboardWithProvider(options: {
  providerKind: "claude" | "mock";
  brief: GenerateStoryboardBrief;
  context: ProjectCreativeContext;
  genOptions?: GenerateStoryboardOptions & { assetBaseUrl?: string };
  /** @internal test hook */
  createClaude?: () => Pick<ClaudeVideoGenerationProvider, "generateStoryboard" | "getModelId">;
}): Promise<StoryboardGenerationResult> {
  const { providerKind, brief, context, genOptions, createClaude } = options;

  if (providerKind === "mock") {
    const mock = new MockVideoGenerationProvider();
    const video = await mock.generateStoryboard(brief, context, genOptions);
    return {
      video,
      provider: "mock",
      model: null,
      mockReason: "ANTHROPIC_API_KEY not configured — using mock provider in development",
    };
  }

  const claude = createClaude?.() ?? new ClaudeVideoGenerationProvider();
  try {
    const video = await claude.generateStoryboard(brief, context, genOptions);
    return {
      video,
      provider: "claude",
      model: claude.getModelId(),
    };
  } catch (err) {
    if (isDevelopmentEnv() && isClaudeCreditOrQuotaError(err)) {
      const mock = new MockVideoGenerationProvider();
      const video = await mock.generateStoryboard(brief, context, genOptions);
      return {
        video,
        provider: "mock",
        model: null,
        mockReason: MOCK_FALLBACK_LABEL,
        fallbackFromClaude: true,
        notice: CLAUDE_CREDITS_UNAVAILABLE_MESSAGE,
      };
    }
    throw err;
  }
}

export function shouldUseProductionClaudeError(err: unknown): boolean {
  return !isDevelopmentEnv() && isClaudeCreditOrQuotaError(err);
}

/** Test helper — simulate Anthropic credit error shape. */
export function makeClaudeCreditError(message = "Your credit balance is too low to access the Anthropic API") {
  const err = new Error(message) as Error & { status: number; error: { type: string; message: string } };
  err.status = 400;
  err.error = { type: "invalid_request_error", message };
  return err;
}
