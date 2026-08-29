"use client";

import { contextLevelLabel, computeContextLevel } from "@/core/ops/completeness";
import { useStudio } from "@/core/store";
import Link from "next/link";
import { useMemo, useState } from "react";
import { btnPrimary, SectionHeader, StatusPill } from "@/core/ui/OpsField";

export default function ProjectsHubPage() {
  const { ready, projects, ops } = useStudio();
  const [statusFilter, setStatusFilter] = useState<"active" | "draft" | "archived" | "all">("active");

  const cards = useMemo(() => {
    return ops.projects
      .map((op) => {
        const studio = projects.find((p) => p.id === op.id);
        return { op, studio };
      })
      .filter(({ op }) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "archived") return op.status === "archived" || op.status === "completed";
        return op.status === statusFilter;
      })
      .sort((a, b) => b.op.updatedAt.localeCompare(a.op.updatedAt));
  }, [ops.projects, projects, statusFilter]);

  const counts = {
    active: ops.projects.filter((p) => p.status === "active").length,
    draft: ops.projects.filter((p) => p.status === "draft").length,
    archived: ops.projects.filter((p) => p.status === "archived" || p.status === "completed").length,
    all: ops.projects.length,
  };

  if (!ready) return <p className="opacity-50">Loading…</p>;

  return (
    <>
      <SectionHeader
        title="Projects"
        action={
          <Link href="/projects/new" className={btnPrimary}>
            New project
          </Link>
        }
      />

      <div className="mb-8 flex gap-2">
        {(["active", "draft", "archived", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className="border px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase"
            style={{
              borderColor: statusFilter === s ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)",
              opacity: statusFilter === s ? 1 : 0.5,
            }}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ op, studio }) => {
          const active = studio?.posts.filter((p) => p.status === "active").length ?? 0;
          const drafts = studio?.posts.filter((p) => p.status === "draft").length ?? 0;
          return (
            <article
              key={op.id}
              className="border border-white/10 transition hover:border-white/25"
              style={{ borderTopColor: op.color, borderTopWidth: 3 }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] tracking-[0.18em] uppercase opacity-40">{op.code}</p>
                  <StatusPill color={op.color}>{op.status}</StatusPill>
                </div>
                <Link href={`/projects/${op.id}/overview`} className="mt-2 block text-xl tracking-[-0.03em]">
                  {op.name}
                </Link>
                <p className="mt-1 text-sm opacity-50">{op.clientName}</p>
                <p className="mt-1 text-[10px] uppercase opacity-35">
                  Context: {contextLevelLabel(computeContextLevel(ops, op.id, studio))}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill>{op.type}</StatusPill>
                  {op.deadline ? (
                    <span className="text-[10px] tracking-[0.12em] uppercase opacity-40">
                      Due {new Date(op.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-[11px] opacity-40">
                  {active} active · {drafts} drafts
                </p>
              </div>
              <div className="flex border-t border-white/10 text-[10px] tracking-[0.12em] uppercase">
                <Link href={`/projects/${op.id}/ideas`} className="flex-1 px-4 py-2.5 opacity-50 hover:opacity-90">
                  Workspace
                </Link>
                <Link href={`/projects/${op.id}/feed`} className="flex-1 border-l border-white/10 px-4 py-2.5 opacity-50 hover:opacity-90">
                  Designs
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
