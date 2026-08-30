import { NextRequest, NextResponse } from "next/server";
import type { ProjectCreativeContext } from "@/core/design/creativeContext";
import type { GenerateStoryboardBrief, GenerateStoryboardOptions } from "@/core/video/generation/provider";
import {
  formatStoryboardError,
  generateStoryboardWithProvider,
  shouldUseProductionClaudeError,
} from "@/core/video/generation/claude-errors";
import {
  getDefaultClaudeVideoModel,
  resolveStoryboardProvider,
} from "@/core/video/generation/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const provider = resolveStoryboardProvider();
  const model = provider === "claude" ? getDefaultClaudeVideoModel() : null;
  return NextResponse.json({
    provider,
    model,
    mockAvailable: provider === "mock",
    message:
      provider === "claude"
        ? "Claude storyboard generation is available."
        : provider === "mock"
          ? "Using mock storyboard provider (development — ANTHROPIC_API_KEY not set)."
          : "Storyboard generation unavailable — configure ANTHROPIC_API_KEY.",
  });
}

export async function POST(request: NextRequest) {
  let body: {
    brief?: GenerateStoryboardBrief;
    context?: ProjectCreativeContext;
    options?: GenerateStoryboardOptions;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON" }, { status: 400 });
  }

  const { brief, context, options } = body;
  if (!brief?.brief?.trim() || !context?.projectId) {
    return NextResponse.json(
      { error: "Missing brief or project context", code: "MISSING_INPUT" },
      { status: 400 },
    );
  }

  const providerKind = resolveStoryboardProvider();
  const assetBaseUrl = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? undefined;

  if (providerKind === "unconfigured") {
    return NextResponse.json(
      {
        error: "Storyboard generation requires ANTHROPIC_API_KEY in production",
        code: "ANTHROPIC_NOT_CONFIGURED",
        provider: "unconfigured",
      },
      { status: 503 },
    );
  }

  try {
    const result = await generateStoryboardWithProvider({
      providerKind,
      brief,
      context,
      genOptions: { ...options, assetBaseUrl },
    });

    return NextResponse.json({
      video: result.video,
      provider: result.provider,
      model: result.model,
      mockReason: result.mockReason,
      fallbackFromClaude: result.fallbackFromClaude ?? false,
      notice: result.notice,
    });
  } catch (err) {
    console.error("[video/storyboard]", err);
    const status = shouldUseProductionClaudeError(err) ? 402 : 500;
    const code = shouldUseProductionClaudeError(err)
      ? "ANTHROPIC_CREDITS_UNAVAILABLE"
      : "GENERATION_FAILED";
    return NextResponse.json(
      {
        error: formatStoryboardError(err),
        code,
        provider: providerKind,
        model: providerKind === "claude" ? getDefaultClaudeVideoModel() : null,
      },
      { status },
    );
  }
}
