"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";
import { useMemo, useState } from "react";
import { btnPrimary, SectionHeader, StatusPill } from "@/core/ui/OpsField";

export default function DashboardPage() {
  const { ready, projects, ops, allPosts } = useStudio();
  const [filter, setFilter] = useState<"active" | "all">("active");

  const activeOps = ops.projects.filter((p) => p.status === "active");
  const upcoming = useMemo(() => {
    const now = new Date();
    const items: { date: string; label: string; href: string; color: string }[] = [];
    for (const d of ops.deliverables) {
      if (!d.deadline) continue;
      const op = ops.projects.find((p) => p.id === d.projectId);
      items.push({
        date: d.deadline,
        label: d.name,
        href: `/projects/${d.projectId}/deliverables`,
        color: op?.color ?? "#6D758F",
      });
    }
    for (const c of ops.contentItems) {
      if (!c.publicationDate) continue;
      const op = ops.projects.find((p) => p.id === c.projectId);
      items.push({
        date: c.publicationDate,
        label: c.title,
        href: `/projects/${c.projectId}/content`,
        color: op?.color ?? "#6D758F",
      });
    }
    return items
      .filter((i) => new Date(i.date) >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [ops]);

  const drafts = allPosts().filter(({ post }) => post.status === "draft").length;
  const weekContent = ops.contentItems.filter((c) => {
    if (!c.publicationDate) return false;
    const d = new Date(c.publicationDate);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  if (!ready) return <p className="opacity-50">Loading…</p>;

  return (
    <>
      <SectionHeader
        title="Studio"
        action={
          <Link href="/projects/new" className={btnPrimary}>
            New project
          </Link>
        }
      />
      <p className="-mt-4 mb-10 max-w-xl text-sm opacity-55">
        Creative operations — strategy, content, design and delivery in one workspace.
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs tracking-[0.16em] uppercase opacity-45">Active projects</h2>
              <Link href="/projects" className="text-[11px] tracking-[0.1em] uppercase opacity-50">
                View all
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeOps.slice(0, 4).map((op) => {
                const studio = projects.find((p) => p.id === op.id);
                const postCount = studio?.posts.filter((p) => p.status === "active").length ?? 0;
                return (
                  <Link
                    key={op.id}
                    href={`/projects/${op.id}/ideas`}
                    className="group border border-white/10 p-5 transition hover:border-white/25"
                    style={{ borderLeftColor: op.color, borderLeftWidth: 3 }}
                  >
                    <p className="text-[10px] tracking-[0.16em] uppercase opacity-40">{op.code}</p>
                    <p className="mt-1 text-lg tracking-[-0.02em]">{op.name}</p>
                    <p className="mt-1 text-xs opacity-45">{op.clientName}</p>
                    <p className="mt-4 text-[10px] tracking-[0.12em] uppercase opacity-35">
                      {postCount} active designs · {op.type}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xs tracking-[0.16em] uppercase opacity-45">Recent activity</h2>
            <ul className="space-y-2">
              {ops.activities.slice(0, 8).map((a) => (
                <li key={a.id} className="flex gap-3 border-b border-white/5 py-2 text-sm opacity-70">
                  <span className="shrink-0 text-[10px] tracking-[0.1em] uppercase opacity-35">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                  {a.message}
                </li>
              ))}
              {ops.activities.length === 0 ? (
                <li className="text-sm opacity-40">No activity yet.</li>
              ) : null}
            </ul>
          </div>
        </section>

        <aside className="space-y-8">
          <div className="border border-white/10 p-5">
            <h2 className="text-xs tracking-[0.16em] uppercase opacity-45">This week</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="opacity-50">Content scheduled</dt>
                <dd>{weekContent}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="opacity-50">Draft designs</dt>
                <dd>{drafts}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="opacity-50">Active projects</dt>
                <dd>{activeOps.length}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="mb-3 text-xs tracking-[0.16em] uppercase opacity-45">Upcoming deadlines</h2>
            <ul className="space-y-2">
              {upcoming.map((item) => (
                <li key={`${item.date}-${item.label}`}>
                  <Link href={item.href} className="flex items-center gap-3 py-1.5 text-sm hover:opacity-80">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="flex-1 truncate opacity-75">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.1em] opacity-40">
                      {item.date.slice(5)}
                    </span>
                  </Link>
                </li>
              ))}
              {upcoming.length === 0 ? (
                <li className="text-sm opacity-40">Nothing due soon.</li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
