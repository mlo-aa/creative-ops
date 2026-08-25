"use client";

import { FluidStage, StudioCanvas, StudioStage } from "@/core/canvas/Canvas";
import { hexOf } from "@/core/color";
import { DesignEditor } from "@/core/editor/DesignEditor";
import { captureJpeg, downloadDataUrl, waitTwoFrames } from "@/core/export/capture";
import { ExportControls, slideFilename } from "@/core/export/ExportControls";
import { getFormat } from "@/core/formats";
import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { canvasBackground, PostArt } from "@/core/templates/registry";
import type { CarouselSlide } from "@/core/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

export default function PostEditorPage() {
  const { postId } = useParams<{ projectId: string; postId: string }>();
  const project = useProject();
  const {
    updateDesign,
    updateSlideOrder,
    duplicateSlide,
    deleteSlide,
    resetDesign,
    duplicateAsVariant,
    setStatus,
  } = useStudio();
  const post = project.posts.find((item) => item.id === postId);
  const format = getFormat(project.formatId);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [slideId, setSlideId] = useState<string | undefined>(undefined);
  const [scale, setScale] = useState(0.48);
  const exporting = capturing || exportProgress !== null;
  const slides = post?.slides ?? [];
  const currentSlide = slides.find((slide) => slide.id === slideId) ?? slides[0];
  const design = currentSlide?.design ?? post?.design;
  const template = currentSlide?.template ?? post?.template;
  const slideIndex = Math.max(0, slides.findIndex((slide) => slide.id === currentSlide?.id));

  useEffect(() => {
    if (currentSlide && slideId !== currentSlide.id) setSlideId(currentSlide.id);
  }, [currentSlide, slideId]);

  useEffect(() => {
    const update = () => setScale(Math.min(0.62, Math.max(0.22, (window.innerHeight - 160) / format.height)));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [format.height]);

  if (!post || !design || !template) {
    return (
      <main className="p-8">
        <Link href={`/projects/${project.id}/feed`} className="text-xs uppercase tracking-[0.14em] opacity-50">
          ← Feed
        </Link>
        <p className="mt-6">Post not found.</p>
      </main>
    );
  }

  async function exportAllSlides() {
    const node = canvasRef.current;
    if (!node || !post) return;
    const original = currentSlide?.id;
    for (let i = 0; i < slides.length; i += 1) {
      setSlideId(slides[i].id);
      await new Promise((resolve) => window.setTimeout(resolve, 140));
      await waitTwoFrames();
      const dataUrl = await captureJpeg(node, format.width, format.height);
      downloadDataUrl(dataUrl, slideFilename(project, post, i));
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    }
    if (original) setSlideId(original);
  }

  return (
    <main className="px-6 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/projects/${project.id}/feed`} className="text-xs uppercase tracking-[0.14em] opacity-50">
            ← Feed
          </Link>
          <p className="mt-3 text-sm tracking-[0.12em] uppercase opacity-60">
            {post.number} — {post.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={chrome} onClick={() => setEditing((v) => !v)}>
            {editing ? "Hide editor" : "Edit design"}
          </button>
          <button
            type="button"
            className={chrome}
            onClick={() => setStatus(project.id, post.id, post.status === "active" ? "draft" : "active")}
          >
            {post.status === "active" ? "Move to drafts" : "Add to feed"}
          </button>
          <button type="button" className={chrome} onClick={() => duplicateAsVariant(project.id, post.id)}>
            Duplicate as variant
          </button>
          <ExportControls
            project={project}
            post={post}
            canvasRef={canvasRef}
            width={format.width}
            height={format.height}
            slideIndex={slideIndex}
            onExportProgress={setExportProgress}
            onExporting={setCapturing}
            onExportAllSlides={post.kind === "carousel" ? exportAllSlides : undefined}
          />
        </div>
      </div>

      {post.kind === "carousel" && currentSlide ? (
        <CarouselBar
          slides={slides}
          currentId={currentSlide.id}
          onSelect={setSlideId}
          onReorder={(ids) => updateSlideOrder(project.id, post.id, ids)}
          onDuplicate={() => {
            const id = duplicateSlide(project.id, post.id, currentSlide.id);
            if (id) setSlideId(id);
          }}
          onDelete={() => deleteSlide(project.id, post.id, currentSlide.id)}
          renderThumb={(slide) => (
            <FluidStage width={format.width} height={format.height}>
              <StudioCanvas
                background={canvasBackground(post, (id) => hexOf(project.brand, id), slide.id)}
                width={format.width}
                height={format.height}
                fontFamily={project.brand.fonts.display}
              >
                <PostArt post={post} projectId={project.id} slideId={slide.id} />
              </StudioCanvas>
            </FluidStage>
          )}
        />
      ) : null}

      <div className="flex justify-center gap-6">
        <StudioStage scale={scale} width={format.width} height={format.height}>
          <StudioCanvas
            ref={canvasRef}
            background={canvasBackground(post, (id) => hexOf(project.brand, id), currentSlide?.id)}
            width={format.width}
            height={format.height}
            fontFamily={project.brand.fonts.display}
            exporting={exporting}
          >
            <PostArt
              post={post}
              projectId={project.id}
              slideId={currentSlide?.id}
              progress={exporting ? exportProgress ?? 0 : undefined}
              editing={editing}
              exporting={exporting}
              onDesignChange={(patch) => updateDesign(project.id, post.id, patch, currentSlide?.id)}
            />
          </StudioCanvas>
        </StudioStage>
        {editing ? (
          <DesignEditor
            template={template}
            design={design}
            brand={project.brand}
            onChange={(patch) => updateDesign(project.id, post.id, patch, currentSlide?.id)}
            onReset={() => resetDesign(project.id, post.id)}
          />
        ) : null}
      </div>
    </main>
  );
}

function CarouselBar({
  slides,
  currentId,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
  renderThumb,
}: {
  slides: CarouselSlide[];
  currentId: string;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  renderThumb: (slide: CarouselSlide) => ReactNode;
}) {
  const index = slides.findIndex((slide) => slide.id === currentId);
  const dragFrom = useRef<string | null>(null);

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragFrom.current) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    const target = el?.closest("[data-slide-id]") as HTMLElement | null;
    const nextId = target?.dataset.slideId;
    if (!nextId || nextId === dragFrom.current) return;
    const ids = slides.map((slide) => slide.id);
    const from = ids.indexOf(dragFrom.current);
    const to = ids.indexOf(nextId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    dragFrom.current = nextId;
    onReorder(next);
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <button type="button" className={chrome} disabled={index <= 0} onClick={() => onSelect(slides[index - 1].id)}>
        Previous
      </button>
      <button type="button" className={chrome} disabled={index >= slides.length - 1} onClick={() => onSelect(slides[index + 1].id)}>
        Next
      </button>
      <div className="flex flex-wrap gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            data-slide-id={slide.id}
            onPointerDown={(event) => {
              dragFrom.current = slide.id;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={() => {
              dragFrom.current = null;
            }}
            onClick={() => onSelect(slide.id)}
            className="w-[72px] border bg-transparent p-0 text-[#f4f1ea]"
            style={{ borderColor: slide.id === currentId ? "#f4f1ea" : "#ffffff33" }}
          >
            <div className="pointer-events-none">{renderThumb(slide)}</div>
            <span className="block px-1 py-1 text-[10px] tracking-[0.08em] uppercase">
              {String(i + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>
      <button type="button" className={chrome} onClick={onDuplicate}>
        Duplicate slide
      </button>
      <button type="button" className={chrome} disabled={slides.length <= 1} onClick={onDelete}>
        Delete slide
      </button>
    </div>
  );
}

const chrome =
  "h-10 border border-white/20 px-3 text-[11px] tracking-[0.08em] uppercase disabled:opacity-30";
