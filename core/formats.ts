import type { FormatPreset } from "@/core/types";

export const FORMAT_PRESETS: FormatPreset[] = [
  { id: "instagram-portrait", name: "Instagram Portrait", width: 1080, height: 1440 },
  { id: "instagram-square", name: "Instagram Square", width: 1080, height: 1080 },
  { id: "instagram-story", name: "Instagram Story", width: 1080, height: 1920 },
  { id: "linkedin-portrait", name: "LinkedIn Portrait", width: 1080, height: 1350 },
  { id: "x-landscape", name: "X Landscape", width: 1600, height: 900 },
];

export const DEFAULT_FORMAT_ID = "instagram-portrait";

export function getFormat(id: string): FormatPreset {
  return (
    FORMAT_PRESETS.find((item) => item.id === id) ?? FORMAT_PRESETS[0]
  );
}

export function safeInset(width: number) {
  return Math.round(80 * (width / 1080));
}
