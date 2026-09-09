"use client";

import { useStudio } from "@/core/store";
import { logDuplicatePostDiagnostics } from "@/core/repository/hydrate";
import { NewReelModal } from "@/core/ui/NewReelModal";
import {
  matchesPostKindFilter,
  POST_KIND_FILTERS,
  reelDurationLabel,
  dedupePostRows,
  countDuplicatePostRows,
  type PostKindFilter,
  isReelPost,
} from "@/core/ui/postListUtils";
import { btnGhost, btnPrimary, SectionHeader, StatusPill } from "@/core/ui/OpsField";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function GlobalPostsPage() {
  const { ready, allPosts, ops, projects, persist } = useStudio();
  const [projectFilter, setProjectFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<PostKindFilter>("all");
  const [newReelOpen, setNewReelOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [reelProjectId, setReelProjectId] = useState<string | null>(null);

  const rawRows = useMemo(() => {
    return allPosts()
      .filter(({ project, post }) => {
        if (projectFilter !== "all" && project.id !== projectFilter) return false;
        return matchesPostKindFilter(post, kindFilter);
      })
      .sort((a, b) => a.project.name.localeCompare(b.project.name));
  }, [allPosts, projectFilter, kindFilter]);

  const rows = useMemo(() => dedupePostRows(rawRows), [rawRows]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !ready) return;
    const hydrated = logDuplicatePostDiagnostics(projects, persist.overlays);
    const rowDupes = [...countDuplicatePostRows(rawRows).entries()].filter(([, n]) => n > 1);
    if (rowDupes.length) {
      console.warn(
        "[Creative Ops] Duplicate rows in GlobalPostsPage:",
        rowDupes.map(([key, count]) => {
          const [projectId, postId] = key.split(":");
          const row = rawRows.find((r) => r.project.id === projectId && r.post.id === postId);
          return {
            projectId,
            postId,
            title: row?.post.title ?? "(unknown)",
            count,
            source: "all-posts",
          };
        }),
      );
    }
    if (hydrated.length === 0 && rowDupes.length === 0) return;
  }, [ready, projects, persist.overlays, rawRows]);

  function openNewReel() {
    if (projectFilter !== "all") {
      setReelProjectId(projectFilter);
      setNewReelOpen(true);
      return;
    }
    setProjectPickerOpen(true);
  }

  function closeNewReel() {
    setNewReelOpen(false);
    setReelProjectId(null);
  }

  function pickProjectForReel(id: string) {
    setReelProjectId(id);
    setProjectPickerOpen(false);
    setNewReelOpen(true);
  }

  if (!ready) return <p className="opacity-50">Loading…</p>;

  const offerhubCount = projects.find((p) => p.id === "offerhub")?.posts.length ?? 0;
  const offerhubUnique = new Set(projects.find((p) => p.id === "offerhub")?.posts.map((p) => p.id)).size;

  if (process.env.NODE_ENV !== "production" && offerhubCount !== offerhubUnique) {
    console.warn(
      `[Creative Ops] offerhub posts: ${offerhubCount} hydrated rows, ${offerhubUnique} unique ids (before page dedupe: ${rawRows.filter((r) => r.project.id === "offerhub").length} rows)`,
    );
  }

  return (
    <>
      <SectionHeader
        title="All designs"
        action={
          <button type="button" className={btnPrimary} onClick={openNewReel}>
            + New Reel
          </button>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="border border-white/10 bg-[#15171a] px-3 py-1.5 text-[11px] uppercase"
        >
          <option value="all">All projects</option>
          {ops.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {POST_KIND_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setKindFilter(f)}
            className="border border-white/10 px-3 py-1.5 text-[10px] uppercase"
            style={{ opacity: kindFilter === f ? 1 : 0.45 }}
          >
            {f}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm opacity-40">
          {kindFilter === "reels"
            ? "No reels yet — click + New Reel to create one."
            : "No posts match this filter."}
        </p>
      ) : null}
      <div className="grid gap-2">
        {rows.map(({ project, post }) => {
          const op = ops.projects.find((p) => p.id === project.id);
          const reel = isReelPost(post);
          return (
            <Link
              key={`${project.id}:${post.id}`}
              href={`/projects/${project.id}/posts/${post.id}`}
              className="flex items-center justify-between border border-white/10 px-4 py-3 hover:border-white/25"
              style={{ borderLeftColor: op?.color, borderLeftWidth: 3 }}
            >
              <span>
                <span className="text-[10px] uppercase tracking-[0.12em] opacity-40">{project.name}</span>
                <span className="ml-3">{post.number} — {post.title}</span>
                {reel ? (
                  <span className="ml-3 text-[10px] uppercase tracking-[0.1em] opacity-45">
                    {reelDurationLabel(post)}
                  </span>
                ) : null}
              </span>
              <span className="flex gap-2">
                <StatusPill>{post.status}</StatusPill>
                {reel ? <StatusPill>REEL</StatusPill> : null}
                {post.video?.voiceover?.assetUrl ? <StatusPill>VO</StatusPill> : null}
                {!reel && post.exportKind === "gif" ? <StatusPill>GIF</StatusPill> : null}
                {!reel && post.kind === "carousel" ? <StatusPill>Carousel</StatusPill> : null}
              </span>
            </Link>
          );
        })}
      </div>

      {projectPickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setProjectPickerOpen(false)}
        >
          <div
            className="w-full max-w-md border border-white/15 bg-[#1b1c1f] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl tracking-[-0.03em]">Choose project</h2>
            <p className="mt-2 text-sm opacity-50">Select which project this reel belongs to.</p>
            <div className="mt-4 grid gap-2">
              {ops.projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="border border-white/10 px-4 py-3 text-left text-sm hover:border-white/25"
                  style={{ borderLeftColor: p.color, borderLeftWidth: 3 }}
                  onClick={() => pickProjectForReel(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <button type="button" className={`${btnGhost} mt-4`} onClick={() => setProjectPickerOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <NewReelModal
        open={newReelOpen}
        onClose={closeNewReel}
        projectId={reelProjectId ?? undefined}
      />
    </>
  );
}
