"use client";

import { ProjectScope } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { contextLevelLabel, computeContextLevel } from "@/core/ops/completeness";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";

const WORKSPACE_TABS = [
  { href: "ideas", label: "Ideas" },
  { href: "overview", label: "Overview" },
  { href: "strategy", label: "Strategy" },
  { href: "sources", label: "Sources" },
  { href: "links", label: "Links" },
  { href: "references", label: "References" },
  { href: "phases", label: "Phases" },
  { href: "deliverables", label: "Deliverables" },
  { href: "branding", label: "Branding" },
  { href: "content", label: "Content" },
];

const STUDIO_TABS = [
  { href: "feed", label: "Feed" },
  { href: "posts", label: "Designs" },
  { href: "templates", label: "Templates" },
  { href: "assets", label: "Assets" },
  { href: "settings", label: "Settings" },
];

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const { ready, getProject, getOpsProject, ops } = useStudio();
  const project = getProject(params.projectId);
  const opsProject = getOpsProject(params.projectId);
  const contextLevel = computeContextLevel(ops, params.projectId, project);

  const inStudio =
    STUDIO_TABS.some(
      (t) =>
        pathname === `/projects/${params.projectId}/${t.href}` ||
        pathname.startsWith(`/projects/${params.projectId}/${t.href}/`),
    ) || pathname.includes("/posts/");

  if (!ready) return <p className="p-10 opacity-50">Loading…</p>;
  if (!project) {
    return (
      <main className="p-10">
        <Link href="/projects" className="text-xs uppercase tracking-[0.14em] opacity-50">
          ← Projects
        </Link>
        <p className="mt-6">Project not found.</p>
      </main>
    );
  }

  return (
    <ProjectScope project={project}>
      <div className="min-h-screen">
        <header className="border-b border-white/10 px-6 py-4">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/projects" className="text-[10px] tracking-[0.14em] uppercase opacity-40">
                ← Projects
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {opsProject ? (
                  <>
                    <span className="text-[10px] tracking-[0.18em] uppercase opacity-50" style={{ color: opsProject.color }}>
                      {opsProject.code}
                    </span>
                  </>
                ) : null}
                <h1 className="text-lg tracking-[-0.02em]">{project.name}</h1>
                {opsProject ? (
                  <>
                    <span className="text-xs opacity-40">{opsProject.clientName}</span>
                    <span className="text-[10px] tracking-[0.14em] uppercase opacity-35">{(opsProject.types ?? [opsProject.type]).join(", ")}</span>
                    <span className="text-[10px] tracking-[0.14em] uppercase opacity-35">{opsProject.status}</span>
                    <span className="text-[10px] tracking-[0.14em] uppercase opacity-35">{contextLevelLabel(contextLevel)}</span>
                  </>
                ) : null}
              </div>
              {project.campaign ? (
                <p className="mt-1 text-[10px] tracking-[0.12em] uppercase opacity-40">{project.campaign}</p>
              ) : null}
            </div>
          </div>

          <nav className="mx-auto mt-5 flex max-w-[1400px] flex-wrap gap-1">
            {WORKSPACE_TABS.map((item) => {
              const href = `/projects/${project.id}/${item.href}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={item.href}
                  href={href}
                  className="px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase"
                  style={{
                    opacity: active && !inStudio ? 1 : 0.4,
                    background: active && !inStudio ? "rgba(255,255,255,0.06)" : "transparent",
                    borderBottom: active && !inStudio ? `2px solid ${opsProject?.color ?? "#fff"}` : "2px solid transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={`/projects/${project.id}/feed`}
              className="px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase"
              style={{
                opacity: inStudio ? 1 : 0.4,
                background: inStudio ? "rgba(255,255,255,0.06)" : "transparent",
                borderBottom: inStudio ? `2px solid ${opsProject?.color ?? "#fff"}` : "2px solid transparent",
              }}
            >
              Posts
            </Link>
          </nav>

          {inStudio ? (
            <nav className="mx-auto mt-2 flex max-w-[1400px] flex-wrap gap-3 border-t border-white/5 pt-2">
              {STUDIO_TABS.map((item) => {
                const href = `/projects/${project.id}/${item.href}`;
                const active =
                  pathname === href ||
                  (item.href === "posts" && pathname.includes("/posts/"));
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className="text-[10px] tracking-[0.12em] uppercase"
                    style={{ opacity: active ? 0.9 : 0.35 }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </header>
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </div>
    </ProjectScope>
  );
}
