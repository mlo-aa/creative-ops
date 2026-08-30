import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { voices: [], errorMessage: "ELEVENLABS_API_KEY not configured" },
      { status: 503 },
    );
  }

  try {
    const client = new ElevenLabsClient({ apiKey });
    const response = await client.voices.getAll();
    const voices = (response.voices ?? []).map((v) => ({
      voiceId: v.voiceId,
      name: v.name ?? "Unknown",
      previewUrl: v.previewUrl ?? null,
      category: v.category ?? null,
      labels: v.labels ?? {},
    }));
    return NextResponse.json({ voices });
  } catch (err) {
    return NextResponse.json(
      { voices: [], errorMessage: err instanceof Error ? err.message : "Failed to load voices" },
      { status: 500 },
    );
  }
}
