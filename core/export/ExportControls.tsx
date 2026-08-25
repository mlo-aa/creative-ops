"use client";

import { captureJpeg, capturePng, downloadBlob, downloadDataUrl } from "@/core/export/capture";
import { encodeGifFromFrames } from "@/core/export/encodeGif";
import type { ProjectConfig, StudioPost } from "@/core/types";
import { useState, type RefObject } from "react";

export function slideFilename(project: ProjectConfig, post: StudioPost, index: number) {
  const n = String(index + 1).padStart(2, "0");
  const prefix = project.exportPrefix || project.id;
  if (post.kind === "carousel") return `${prefix}-${post.id}-${n}.jpg`;
  return `${prefix}-post-${post.id}.jpg`;
}

export function ExportControls({
  project,
  post,
  canvasRef,
  width,
  height,
  slideIndex = 0,
  onExportProgress,
  onExporting,
  onExportAllSlides,
}: {
  project: ProjectConfig;
  post: StudioPost;
  canvasRef: RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
  slideIndex?: number;
  onExportProgress?: (progress: number | null) => void;
  onExporting?: (value: boolean) => void;
  onExportAllSlides?: () => Promise<void>;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const prefix = project.exportPrefix || project.id;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    onExporting?.(true);
    setStatus(label);
    try {
      await fn();
      setStatus("Ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Export failed.");
    } finally {
      onExportProgress?.(null);
      onExporting?.(false);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy}
        className={btn}
        onClick={() =>
          run("Exporting JPG…", async () => {
            const node = canvasRef.current;
            if (!node) return;
            const dataUrl = await captureJpeg(node, width, height);
            downloadDataUrl(
              dataUrl,
              post.kind === "carousel"
                ? slideFilename(project, post, slideIndex)
                : `${prefix}-post-${post.id}.jpg`,
            );
          })
        }
      >
        {post.kind === "carousel" ? "Export slide JPG" : "Export JPG"}
      </button>
      <button
        type="button"
        disabled={busy}
        className={btn}
        onClick={() =>
          run("Exporting PNG…", async () => {
            const node = canvasRef.current;
            if (!node) return;
            const dataUrl = await capturePng(node, width, height);
            downloadDataUrl(dataUrl, `${prefix}-post-${post.id}.png`);
          })
        }
      >
        Export PNG
      </button>
      {post.exportKind === "gif" ? (
        <button
          type="button"
          disabled={busy}
          className={btn}
          onClick={() =>
            run("Preparing GIF…", async () => {
              const node = canvasRef.current;
              if (!node) return;
              const duration = Math.max(400, post.durationMs / Math.max(0.25, post.design.animationSpeed || 1));
              const frames = Math.max(48, Math.round((duration / 1000) * 10));
              const blob = await encodeGifFromFrames(
                node,
                width,
                height,
                frames,
                duration,
                (current, total) => setStatus(`Encoding GIF ${current} / ${total}`),
                async (progress) => {
                  onExportProgress?.(progress);
                  await new Promise((resolve) => window.setTimeout(resolve, 24));
                },
              );
              downloadBlob(blob, `${prefix}-post-${post.id}.gif`);
            })
          }
        >
          Export GIF
        </button>
      ) : null}
      {post.kind === "carousel" ? (
        <button
          type="button"
          disabled={busy}
          className={btn}
          onClick={() => run("Exporting slides…", async () => onExportAllSlides?.())}
        >
          Export all slides
        </button>
      ) : null}
      {status ? <span className="text-[13px] opacity-70">{status}</span> : null}
    </div>
  );
}

const btn =
  "h-10 border border-white/20 px-4 text-[12px] tracking-[0.08em] uppercase disabled:opacity-40";
