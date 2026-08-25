import { captureCanvas, waitTwoFrames } from "@/core/export/capture";

type GifencModule = {
  GIFEncoder: () => {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      options: { palette: number[][]; delay: number; repeat?: number },
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };
  quantize: (rgba: Uint8Array, maxColors: number) => number[][];
  applyPalette: (rgba: Uint8Array, palette: number[][]) => Uint8Array;
};

export async function encodeGifFromFrames(
  node: HTMLElement,
  width: number,
  height: number,
  frameCount: number,
  durationMs: number,
  onProgress?: (current: number, total: number) => void,
  setProgress?: (progress: number) => void | Promise<void>,
) {
  const gifenc = (await import("gifenc")) as GifencModule;
  const { GIFEncoder, quantize, applyPalette } = gifenc;
  const gif = GIFEncoder();
  const delay = Math.round(durationMs / frameCount);

  for (let i = 0; i < frameCount; i += 1) {
    const progress = i / Math.max(frameCount - 1, 1);
    if (setProgress) await setProgress(progress);
    await waitTwoFrames();
    const canvas = await captureCanvas(node, width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not read canvas for GIF export.");
    const { data } = ctx.getImageData(0, 0, width, height);
    const rgba = new Uint8Array(data);
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: i === 0 ? 0 : undefined,
    });
    onProgress?.(i + 1, frameCount);
  }

  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}
