"use client";

import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { NewDesignModal } from "@/core/ui/NewDesignModal";
import { NewReelModal } from "@/core/ui/NewReelModal";
import {
  isReelPost,
  matchesPostKindFilter,
  POST_KIND_FILTERS,
  reelDurationLabel,
  type PostKindFilter,
} from "@/core/ui/postListUtils";
import { btnPrimary, StatusPill } from "@/core/ui/OpsField";
import { DropdownMenu, MenuItem } from "@/core/ui/workspace-ui";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function PostsPage() {
  const project = useProject();
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [reelModalOpen, setReelModalOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<PostKindFilter>("all");

  const rows = useMemo(
    () => project.posts.filter((post) => matchesPostKindFilter(post, kindFilter)),
    [project.posts, kindFilter],
  );

  const primaryIsReel = kindFilter === "reels";

  return (
    <main className="px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Designs</h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            Static designs, carousels, and reels for {project.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={btnPrimary}
            onClick={() => (primaryIsReel ? setReelModalOpen(true) : setDesignModalOpen(true))}
          >
            {primaryIsReel ? "+ New reel" : "+ New design"}
          </button>
          <DropdownMenu
            label="Create options"
            trigger={
              <span className="inline-flex h-10 items-center rounded-xl border border-white/15 px-3 text-[13px] opacity-60">
                ···
              </span>
            }
          >
            <MenuItem onClick={() => setDesignModalOpen(true)}>New design</MenuItem>
            <MenuItem onClick={() => setReelModalOpen(true)}>New reel</MenuItem>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter designs">
        {POST_KIND_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={kindFilter === f}
            onClick={() => setKindFilter(f)}
            className="rounded-lg border border-white/10 px-3.5 py-2 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--project-accent,#e4e0d4)]"
            style={{ opacity: kindFilter === f ? 1 : 0.45 }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-white/40">
            {kindFilter === "reels" ? "No reels yet — create one to get started." : "No posts match this filter."}
          </p>
        ) : null}
        {rows.map((post) => {
          const reel = isReelPost(post);
          return (
            <Link
              key={post.id}
              href={`/projects/${project.id}/posts/${post.id}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3.5 hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--project-accent,#e4e0d4)]"
            >
              <span>
                {post.number} — {post.title}
                {reel ? (
                  <span className="ml-3 text-[12px] text-white/45">
                    {reelDurationLabel(post)}
                  </span>
                ) : null}
              </span>
              <span className="flex gap-2">
                <StatusPill>{post.status}</StatusPill>
                {reel ? <StatusPill>Reel</StatusPill> : null}
                {post.video?.voiceover?.assetUrl ? <StatusPill>Voiceover</StatusPill> : null}
                {!reel && post.exportKind === "gif" ? <StatusPill>GIF</StatusPill> : null}
                {!reel && post.kind === "carousel" ? <StatusPill>Carousel</StatusPill> : null}
              </span>
            </Link>
          );
        })}
      </div>

      <NewDesignModal
        open={designModalOpen}
        onClose={() => setDesignModalOpen(false)}
        onReel={() => {
          setDesignModalOpen(false);
          setReelModalOpen(true);
        }}
      />
      <NewReelModal open={reelModalOpen} onClose={() => setReelModalOpen(false)} projectId={project.id} />
    </main>
  );
}
