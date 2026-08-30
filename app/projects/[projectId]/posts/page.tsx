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

  return (
    <main className="px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.03em]">Designs</h1>
          <p className="mt-2 max-w-xl text-sm opacity-55">
            Static designs, carousels, and reels — blank, template, AI storyboard, or editable video.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnPrimary} onClick={() => setReelModalOpen(true)}>
            + New Reel
          </button>
          <button type="button" className={btnPrimary} onClick={() => setDesignModalOpen(true)}>
            + New content
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
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

      <div className="mt-6 grid gap-3">
        {rows.length === 0 ? (
          <p className="text-sm opacity-40">
            {kindFilter === "reels" ? "No reels yet — click + New Reel to create one." : "No posts match this filter."}
          </p>
        ) : null}
        {rows.map((post) => {
          const reel = isReelPost(post);
          return (
            <Link
              key={post.id}
              href={`/projects/${project.id}/posts/${post.id}`}
              className="flex items-center justify-between border border-white/10 px-4 py-3 hover:border-white/25"
            >
              <span>
                {post.number} — {post.title}
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

      <NewDesignModal
        open={designModalOpen}
        onClose={() => setDesignModalOpen(false)}
        onReel={() => {
          setDesignModalOpen(false);
          setReelModalOpen(true);
        }}
      />
      <NewReelModal
        open={reelModalOpen}
        onClose={() => setReelModalOpen(false)}
        projectId={project.id}
      />
    </main>
  );
}
