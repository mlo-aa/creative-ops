"use client";

import { FluidStage, StudioCanvas, StudioStage } from "@/core/canvas/Canvas";
import { hexOf } from "@/core/color";
import { DesignEditor } from "@/core/editor/DesignEditor";
import { DocumentEditor } from "@/core/editor/DocumentEditor";
import { VideoEditor } from "@/core/editor/VideoEditor";
import { captureJpeg, downloadDataUrl, waitTwoFrames } from "@/core/export/capture";
import { ExportControls, slideFilename } from "@/core/export/ExportControls";
import { getFormat } from "@/core/formats";
import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { canvasBackground, PostArt } from "@/core/templates/registry";
import type { CarouselSlide } from "@/core/types";
import type { VariationMode } from "@/core/design/generation/provider";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

export default function PostEditorPage() {
  const { postId } = useParams<{ projectId: string; postId: string }>();
  const project = useProject();
  const {
    updateDesign,
    updateDocument,
    updateSlideOrder,
    duplicateSlide,
    deleteSlide,
    resetDesign,
    duplicateAsVariant,
    setStatus,
    generateDesignVariations,
    saveDesignAsTemplate,
    setDesignReferences,
  } = useStudio();
  const post = project.posts.find((item) => item.id === postId);
  const format = getFormat(project.formatId);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [slideId, setSlideId] = useState<string | undefined>(undefined);
  const [scale, setScale] = useState(0.48);
  const [selectedLayerId, setSelectedLayerId] = useState<string | undefined>();
  const [refPicker, setRefPicker] = useState(false);
  const [variationPicker, setVariationPicker] = useState(false);
  const [variationMode, setVariationMode] = useState<VariationMode>("same_content_new_layout");
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const isDocument = post?.template === "document" && Boolean(post.document);
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

  if (!post) {
    return (
      <main className="p-8">
        <Link href={`/projects/${project.id}/feed`} className="text-sm text-white/50">
          ← Feed
        </Link>
        <p className="mt-6">Post not found.</p>
      </main>
    );
  }

  if (post.video) {
    return <VideoEditor post={post} />;
  }

  if (!design || !template) {
    return (
      <main className="p-8">
        <Link href={`/projects/${project.id}/feed`} className="text-sm text-white/50">
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
          <p className="mt-2 text-[15px] font-medium text-white/70">
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
          {isDocument && post.document ? (
            <>
              <button
                type="button"
                className={chrome}
                onClick={() => setVariationPicker((v) => !v)}
              >
                Generate variations
              </button>
              <button
                type="button"
                className={chrome}
                onClick={() => {
                  const name = window.prompt("Template name", post.title);
                  if (name) saveDesignAsTemplate(project.id, post.id, name);
                }}
              >
                Use as template
              </button>
              <button type="button" className={chrome} onClick={() => setRefPicker((v) => !v)}>
                Reference designs
              </button>
            </>
          ) : null}
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

      {variationPicker && isDocument ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 p-3">
          <div>
            <p className="mb-2 text-[12px] text-white/40">Variation mode</p>
            <select
              className="rounded-lg border border-white/10 bg-[#15171a] px-3 py-2 text-xs"
              value={variationMode}
              onChange={(e) => setVariationMode(e.target.value as VariationMode)}
            >
              <option value="same_content_new_layout">Same content, new layout</option>
              <option value="same_layout_new_content">Same layout, new content</option>
              <option value="color_variation">New color variation</option>
              <option value="more_experimental">More experimental</option>
            </select>
          </div>
          <button
            type="button"
            className={chrome}
            disabled={generatingVariations}
            onClick={async () => {
              setGeneratingVariations(true);
              try {
                const ids = await generateDesignVariations(project.id, post.id, variationMode);
                if (ids[0]) window.location.href = `/projects/${project.id}/posts/${ids[0]}`;
              } finally {
                setGeneratingVariations(false);
              }
            }}
          >
            {generatingVariations ? "Generating…" : "Create 2 variations"}
          </button>
        </div>
      ) : null}

      {refPicker && isDocument ? (
        <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-white/10 p-3">
          <span className="w-full text-[12px] text-white/40">Reference for future generations</span>
          {project.posts.filter((p) => p.id !== post.id).map((p) => (
            <button
              key={p.id}
              type="button"
              className="rounded-lg border px-2.5 py-1.5 text-[12px]"
              style={{ opacity: post.referencePostIds?.includes(p.id) ? 1 : 0.35 }}
              onClick={() => {
                const ids = new Set(post.referencePostIds ?? []);
                if (ids.has(p.id)) ids.delete(p.id);
                else ids.add(p.id);
                setDesignReferences(project.id, post.id, [...ids]);
              }}
            >
              {p.number} {p.title}
            </button>
          ))}
        </div>
      ) : null}

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
              onDocumentChange={
                post.document
                  ? (doc) => updateDocument(project.id, post.id, doc)
                  : undefined
              }
            />
          </StudioCanvas>
        </StudioStage>
        {editing ? (
          isDocument && post.document ? (
            <DocumentEditor
              document={post.document}
              brand={project.brand}
              selectedId={selectedLayerId}
              onSelect={setSelectedLayerId}
              onChange={(doc) => updateDocument(project.id, post.id, doc)}
            />
          ) : (
            <DesignEditor
              template={template}
              design={design}
              brand={project.brand}
              onChange={(patch) => updateDesign(project.id, post.id, patch, currentSlide?.id)}
              onReset={() => resetDesign(project.id, post.id)}
            />
          )
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
            className="w-[72px] overflow-hidden rounded-lg border bg-transparent p-0 text-[#f2f1ed]"
            style={{ borderColor: slide.id === currentId ? "#f2f1ed" : "#ffffff33" }}
          >
            <div className="pointer-events-none">{renderThumb(slide)}</div>
            <span className="block px-1 py-1 text-[12px]">
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
  "h-10 rounded-xl border border-white/20 px-3.5 text-[13px] disabled:opacity-30";
