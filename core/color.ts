import type { BrandColor, BrandProfile, DesignState } from "@/core/types";

function parseHex(hex: string) {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : value;
  const n = Number.parseInt(full.slice(0, 6), 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

export function luminance(hex: string) {
  const { r, g, b } = parseHex(hex);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export function isLightHex(hex: string) {
  return luminance(hex) > 0.45;
}

export function contrastOk(bg: string, fg: string) {
  return isLightHex(bg) !== isLightHex(fg);
}

export function rgba(hex: string, alpha: number) {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function photoOverlay(hex: string, intensity: number) {
  if (intensity <= 0) return undefined;
  const top = rgba(hex, Math.min(0.92, intensity * 0.88));
  const mid = rgba(hex, intensity * 0.38);
  const low = rgba(hex, intensity * 0.22);
  const bottom = rgba(hex, Math.min(0.94, intensity * 0.9));
  return `linear-gradient(180deg, ${top} 0%, ${mid} 34%, ${low} 58%, ${bottom} 100%)`;
}

export function colorById(brand: BrandProfile, id: string) {
  return brand.colors.find((color) => color.id === id) ?? brand.colors[0];
}

export function hexOf(brand: BrandProfile, id: string) {
  return colorById(brand, id)?.hex ?? "#111111";
}

export function bestContrastId(brand: BrandProfile, backgroundId: string) {
  const bg = hexOf(brand, backgroundId);
  const ranked = [...brand.colors].sort((a, b) => {
    const da = Math.abs(luminance(a.hex) - luminance(bg));
    const db = Math.abs(luminance(b.hex) - luminance(bg));
    return db - da;
  });
  return ranked[0]?.id ?? backgroundId;
}

export function sanitizeDesignColors(brand: BrandProfile, design: Pick<DesignState, "background" | "text" | "accent">) {
  const result = { ...design };
  const bg = hexOf(brand, result.background);
  const text = hexOf(brand, result.text);
  const accent = hexOf(brand, result.accent);
  if (!contrastOk(bg, text)) {
    result.text = bestContrastId(brand, result.background);
  }
  if (!contrastOk(bg, accent)) {
    const next = bestContrastId(brand, result.background);
    if (next !== result.background) result.accent = next;
  }
  return result;
}

export function colorOptions(brand: BrandProfile): BrandColor[] {
  return brand.colors;
}
