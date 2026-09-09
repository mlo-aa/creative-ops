"use client";

import { useStudio } from "@/core/store";
import { meshGradient } from "@/core/ui/gradient";
import { btnPrimary, inputClass, SectionHeader } from "@/core/ui/OpsField";
import { Calendar, FileText, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function DashboardPage() {
  const { ready, projects, ops, allPosts, addIdea } = useStudio();
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaProjectId, setIdeaProjectId] = useState("");
  const [ideaSaved, setIdeaSaved] = useState(false);

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

  const recentActivity = ops.activities.slice(0, 6);

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
      <p className="-mt-4 mb-10 max-w-xl text-sm text-white/55">
        Creative operations — strategy, content, design and delivery in one workspace.
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-10 lg:col-span-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-white/70">Active projects</h2>
              <Link href="/projects" className="text-[13px] text-white/45 hover:text-white/70">
                View all
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeOps.slice(0, 4).map((op) => {
                const studio = projects.find((p) => p.id === op.id);
                const postCount = studio?.posts.filter((p) => p.status === "active").length ?? 0;
                return (
                  <Link
                    key={op.id}
                    href={`/projects/${op.id}/overview`}
                    className="group relative isolate flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[18px] p-5 text-white transition"
                    style={{ backgroundImage: meshGradient(op.color) }}
                  >
                    <div>
                      <p className="text-[12px] text-white/70">{op.code}</p>
                      <p className="mt-1 text-xl font-semibold tracking-[-0.01em]">{op.name}</p>
                      <p className="mt-1 text-[13px] text-white/70">{op.clientName}</p>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold leading-none">{postCount}</p>
                        <p className="mt-1 text-[12px] text-white/70">Active designs</p>
                      </div>
                      <span className="rounded-full bg-black/25 px-2.5 py-1 text-[12px] text-white/85">
                        {(op.types ?? [op.type]).join(", ")}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {activeOps.length === 0 ? (
                <Link
                  href="/projects/new"
                  className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-[18px] border border-white/10 text-sm text-white/45 hover:border-white/25"
                >
                  <Plus size={18} />
                  Start your first project
                </Link>
              ) : null}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-[15px] font-medium text-white/70">Recent activity</h2>
            {recentActivity.length ? (
              <ul className="space-y-1">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex gap-3 border-b border-white/6 py-2.5 text-sm text-white/70">
                    <span className="shrink-0 text-[12px] text-white/35">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                    {a.message}
                  </li>
                ))}
              </ul>
            ) : (
              <form
                className="flex flex-col gap-3 rounded-[18px] border border-white/10 p-5 sm:flex-row sm:items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  const projectId = ideaProjectId || activeOps[0]?.id;
                  if (!ideaTitle.trim() || !projectId) return;
                  addIdea({
                    projectId,
                    title: ideaTitle.trim(),
                    body: "",
                    category: "",
                    status: "idea",
                    tags: [],
                    onGlobalMap: true,
                  });
                  setIdeaTitle("");
                  setIdeaSaved(true);
                  window.setTimeout(() => setIdeaSaved(false), 2000);
                }}
              >
                <div className="flex-1">
                  <p className="text-sm text-white/60">Nothing's happened yet — got an idea on your mind?</p>
                  <input
                    value={ideaTitle}
                    onChange={(e) => setIdeaTitle(e.target.value)}
                    placeholder="Capture a quick idea…"
                    className={`${inputClass} mt-2`}
                  />
                </div>
                {activeOps.length > 1 ? (
                  <select
                    value={ideaProjectId}
                    onChange={(e) => setIdeaProjectId(e.target.value)}
                    className={`${inputClass} sm:w-40`}
                  >
                    <option value="">{activeOps[0]?.name}</option>
                    {activeOps.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button type="submit" className={btnPrimary}>
                  {ideaSaved ? "Added ✓" : "Add to idea map"}
                </button>
              </form>
            )}
          </div>
        </section>

        <aside className="space-y-8">
          <div className="rounded-[18px] border border-white/10 p-5">
            <h2 className="text-[15px] font-medium text-white/70">This week</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat icon={<Calendar size={16} />} value={weekContent} label="Scheduled" />
              <Stat icon={<FileText size={16} />} value={drafts} label="Drafts" />
              <Stat icon={<Layers size={16} />} value={activeOps.length} label="Projects" />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[15px] font-medium text-white/70">Upcoming deadlines</h2>
            <ul className="space-y-1">
              {upcoming.map((item) => (
                <li key={`${item.date}-${item.label}`}>
                  <Link href={item.href} className="flex items-center gap-3 rounded-lg py-2 text-sm hover:bg-white/5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="flex-1 truncate text-white/75">{item.label}</span>
                    <span className="text-[12px] text-white/40">{item.date.slice(5)}</span>
                  </Link>
                </li>
              ))}
              {upcoming.length === 0 ? <li className="text-sm text-white/40">Nothing due soon.</li> : null}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div>
      <div className="text-white/40">{icon}</div>
      <p className="mt-2 text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[12px] text-white/45">{label}</p>
    </div>
  );
}
