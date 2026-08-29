"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SectionHeader, StatusPill } from "@/core/ui/OpsField";

export default function GlobalPostsPage() {
  const { ready, allPosts, ops } = useStudio();
  const [projectFilter, setProjectFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<"all" | "gif" | "static" | "carousel" | "draft" | "active">("all");

  const rows = useMemo(() => {
    return allPosts()
      .filter(({ project, post }) => {
        if (projectFilter !== "all" && project.id !== projectFilter) return false;
        if (kindFilter === "gif" && post.exportKind !== "gif") return false;
        if (kindFilter === "static" && post.exportKind !== "jpg") return false;
        if (kindFilter === "carousel" && post.kind !== "carousel") return false;
        if (kindFilter === "draft" && post.status !== "draft") return false;
        if (kindFilter === "active" && post.status !== "active") return false;
        return true;
      })
      .sort((a, b) => a.project.name.localeCompare(b.project.name));
  }, [allPosts, projectFilter, kindFilter]);

  if (!ready) return <p className="opacity-50">Loading…</p>;

  return (
    <>
      <SectionHeader title="All designs" />
      <div className="mb-6 flex flex-wrap gap-2">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="border border-white/10 bg-[#141414] px-3 py-1.5 text-[11px] uppercase"
        >
          <option value="all">All projects</option>
          {ops.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {(["all", "active", "draft", "gif", "static", "carousel"] as const).map((f) => (
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
      <div className="grid gap-2">
        {rows.map(({ project, post }) => {
          const op = ops.projects.find((p) => p.id === project.id);
          return (
            <Link
              key={`${project.id}-${post.id}`}
              href={`/projects/${project.id}/posts/${post.id}`}
              className="flex items-center justify-between border border-white/10 px-4 py-3 hover:border-white/25"
              style={{ borderLeftColor: op?.color, borderLeftWidth: 3 }}
            >
              <span>
                <span className="text-[10px] uppercase tracking-[0.12em] opacity-40">{project.name}</span>
                <span className="ml-3">{post.number} — {post.title}</span>
              </span>
              <span className="flex gap-2">
                <StatusPill>{post.status}</StatusPill>
                {post.exportKind === "gif" ? <StatusPill>GIF</StatusPill> : null}
                {post.kind === "carousel" ? <StatusPill>Carousel</StatusPill> : null}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
