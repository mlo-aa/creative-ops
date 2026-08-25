import { toCanvas, toJpeg, toPng } from "html-to-image";

export async function waitForFonts() {
  if (typeof document === "undefined") return;
  await document.fonts.ready;
}

export async function waitTwoFrames() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function options(width: number, height: number) {
  return {
    pixelRatio: 1,
    canvasWidth: width,
    canvasHeight: height,
    width,
    height,
    cacheBust: true,
    style: {
      transform: "none",
      left: "0",
      top: "0",
    },
  };
}

export async function captureJpeg(node: HTMLElement, width: number, height: number, quality = 0.95) {
  await waitForFonts();
  await waitTwoFrames();
  return toJpeg(node, { ...options(width, height), quality, backgroundColor: undefined });
}

export async function capturePng(node: HTMLElement, width: number, height: number) {
  await waitForFonts();
  await waitTwoFrames();
  return toPng(node, { ...options(width, height), backgroundColor: undefined });
}

export async function captureCanvas(node: HTMLElement, width: number, height: number) {
  await waitForFonts();
  await waitTwoFrames();
  return toCanvas(node, options(width, height));
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
