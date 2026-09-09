"use client";

import { FluidStage, StudioCanvas } from "@/core/canvas/Canvas";
import { getFormat } from "@/core/formats";
import { hexOf } from "@/core/color";
import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { canvasBackground, PostArt } from "@/core/templates/registry";
import type { StudioPost } from "@/core/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

function moveItem<T>(list: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function FeedPage() {
  const project = useProject();
  const { setStatus, reorder, duplicateAsVariant, deletePost } = useStudio();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"feed" | "board">("feed");
  const active = project.posts.filter((post) => post.status === "active");
  const drafts = project.posts.filter((post) => post.status === "draft");

  return (
    <main className="px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <ModeChip active={viewMode === "feed"} onClick={() => setViewMode("feed")}>
            Feed
          </ModeChip>
          <ModeChip active={viewMode === "board"} onClick={() => setViewMode("board")}>
            Full post
          </ModeChip>
        </div>
      </div>
      <Section
        title="Active feed"
        empty="No active posts."
        posts={active}
        viewMode={viewMode}
        projectId={project.id}
        onReorder={(ids) => reorder(project.id, "active", ids)}
        onToggle={(id) => setStatus(project.id, id, "draft")}
        onVariant={(id) => {
          const next = duplicateAsVariant(project.id, id);
          if (next) router.push(`/projects/${project.id}/posts/${next}`);
        }}
        onDelete={(id) => deletePost(project.id, id)}
      />
      <Section
        title="Drafts"
        empty="No drafts."
        posts={drafts}
        viewMode={viewMode}
        projectId={project.id}
        onReorder={(ids) => reorder(project.id, "draft", ids)}
        onToggle={(id) => setStatus(project.id, id, "active")}
        onVariant={(id) => {
          const next = duplicateAsVariant(project.id, id);
          if (next) router.push(`/projects/${project.id}/posts/${next}`);
        }}
        onDelete={(id) => deletePost(project.id, id)}
      />
    </main>
  );
}

function Section({
  title,
  empty,
  posts,
  viewMode,
  projectId,
  onReorder,
  onToggle,
  onVariant,
  onDelete,
}: {
  title: string;
  empty: string;
  posts: StudioPost[];
  viewMode: "feed" | "board";
  projectId: string;
  onReorder: (ids: string[]) => void;
  onToggle: (id: string) => void;
  onVariant: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const project = useProject();
  const format = getFormat(project.formatId);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragFrom = useRef<string | null>(null);
  const didDrag = useRef(false);
  const lastOver = useRef<string | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const orderRef = useRef(posts);
  orderRef.current = posts;

  function onPointerDown(event: ReactPointerEvent<HTMLElement>, id: string) {
    if (event.button !== 0) return;
    didDrag.current = false;
    dragFrom.current = id;
    lastOver.current = id;
    origin.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragFrom.current) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    if (!didDrag.current && Math.hypot(dx, dy) < 8) return;
    didDrag.current = true;
    setDraggingId(dragFrom.current);
    const el = document.elementFromPoint(event.clientX, event.clientY);
    const item = el?.closest("[data-feed-id]") as HTMLElement | null;
    const nextId = item?.dataset.feedId ?? null;
    if (!nextId || nextId === dragFrom.current || nextId === lastOver.current) return;
    lastOver.current = nextId;
    const current = orderRef.current;
    onReorder(
      moveItem(
        current.map((post) => post.id),
        current.findIndex((post) => post.id === dragFrom.current),
        current.findIndex((post) => post.id === nextId),
      ),
    );
  }

  function onPointerUp() {
    dragFrom.current = null;
    lastOver.current = null;
    setDraggingId(null);
  }

  return (
    <section className="mb-12">
      <p className="mb-4 text-[15px] font-medium text-white/60">{title}</p>
      {posts.length === 0 ? (
        <p className="text-sm text-white/45">{empty}</p>
      ) : (
        <div
          className="grid grid-cols-3"
          style={{ gap: viewMode === "feed" ? 3 : 28 }}
        >
          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              layout
              data-feed-id={post.id}
              onPointerDown={(event) => onPointerDown(event, post.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                cursor: draggingId === post.id ? "grabbing" : "grab",
                opacity: draggingId === post.id ? 0.55 : 1,
                touchAction: "none",
              }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={`/projects/${projectId}/posts/${post.id}`}
                draggable={false}
                onClick={(event) => {
                  if (didDrag.current) event.preventDefault();
                }}
                className="block text-inherit no-underline"
              >
                <div className="relative overflow-hidden rounded-2xl">
                  <FluidStage width={format.width} height={format.height}>
                    <StudioCanvas
                      background={canvasBackground(post, (id) => hexOf(project.brand, id))}
                      width={format.width}
                      height={format.height}
                      fontFamily={project.brand.fonts.display}
                    >
                      <PostArt post={post} projectId={projectId} />
                    </StudioCanvas>
                  </FluidStage>
                  <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[12px]">{index + 1}</span>
                  <div className="absolute right-2 bottom-2 flex gap-1 text-[12px]">
                    {post.kind === "carousel" ? (
                      <span className="rounded-full bg-black/70 px-2 py-1">{post.slides?.length ?? 0} slides</span>
                    ) : null}
                    {post.exportKind === "gif" ? (
                      <span className="rounded-full bg-black/70 px-2 py-1">GIF</span>
                    ) : null}
                    {post.variantLabel ? (
                      <span className="rounded-full bg-black/70 px-2 py-1">{post.variantLabel}</span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-[13px] text-white/55">
                  {post.number} — {post.title}
                </p>
              </Link>
              <div
                className="mt-2 mb-4 flex flex-wrap gap-3 text-[12px] text-white/50"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button type="button" onClick={() => onToggle(post.id)}>
                  {post.status === "active" ? "Draft" : "Active"}
                </button>
                <Link href={`/projects/${projectId}/posts/${post.id}`}>Edit</Link>
                <button type="button" onClick={() => onVariant(post.id)}>
                  Duplicate as variant
                </button>
                <button type="button" onClick={() => onDelete(post.id)}>
                  Delete
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

function ModeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-3.5 py-2 text-[13px]"
      style={{ border: `1px solid ${active ? "#f2f1ed" : "#ffffff28"}` }}
    >
      {children}
    </button>
  );
}
