/**
 * Soft mesh gradient derived from a project's own brand color — used only
 * on the 1-2 "hero" cards per screen (never as a full-screen background).
 * Relies on CSS color-mix(), supported in all current browsers incl. iPadOS Safari.
 */
export function meshGradient(hex: string): string {
  return [
    "linear-gradient(to bottom, rgba(12,13,15,0.32), rgba(12,13,15,0.02) 55%)",
    `radial-gradient(at 12% 18%, color-mix(in srgb, ${hex} 55%, white 35%) 0%, transparent 55%)`,
    `radial-gradient(at 88% 12%, color-mix(in srgb, ${hex} 65%, white 15%) 0%, transparent 60%)`,
    `radial-gradient(at 75% 95%, color-mix(in srgb, ${hex} 70%, black 25%) 0%, transparent 55%)`,
    `linear-gradient(160deg, color-mix(in srgb, ${hex} 85%, black 12%) 0%, color-mix(in srgb, ${hex} 55%, black 40%) 100%)`,
  ].join(", ");
}
