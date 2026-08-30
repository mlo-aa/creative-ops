"use client";

import { ProjectScope } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { contextLevelLabel, computeContextLevel } from "@/core/ops/completeness";
import {
  activeProjectTab,
  isProjectStudioPath,
  PROJECT_STUDIO_TABS,
  PROJECT_WORKSPACE_TABS,
  projectSectionSubNav,
} from "@/core/ui/nav-config";
import { SubNav } from "@/core/ui/workspace-ui";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const { ready, getProject, getOpsProject, ops } = useStudio();
  const project = getProject(params.projectId);
  const opsProject = getOpsProject(params.projectId);
  const contextLevel = computeContextLevel(ops, params.projectId, project);

  const inStudio = isProjectStudioPath(pathname, params.projectId);
  const activeTab = activeProjectTab(pathname, params.projectId);
  const subNavItems = activeTab ? projectSectionSubNav(activeTab.sections) : [];

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
              <Link
                href="/projects"
                className="text-[10px] tracking-[0.14em] uppercase opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
              >
                ← Projects
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {opsProject ? (
                  <span
                    className="text-[10px] tracking-[0.18em] uppercase opacity-50"
                    style={{ color: opsProject.color }}
                  >
                    {opsProject.code}
                  </span>
                ) : null}
                <h1 className="text-lg tracking-[-0.02em]">{project.name}</h1>
                {opsProject ? (
                  <>
                    <span className="text-xs opacity-40">{opsProject.clientName}</span>
                    <span className="text-[10px] tracking-[0.14em] uppercase opacity-35">
                      {(opsProject.types ?? [opsProject.type]).join(", ")}
                    </span>
                    <span className="text-[10px] tracking-[0.14em] uppercase opacity-35">{opsProject.status}</span>
                    <span className="text-[10px] tracking-[0.14em] uppercase opacity-35">
                      {contextLevelLabel(contextLevel)}
                    </span>
                  </>
                ) : null}
              </div>
              {project.campaign ? (
                <p className="mt-1 text-[10px] tracking-[0.12em] uppercase opacity-40">{project.campaign}</p>
              ) : null}
            </div>
          </div>

          <nav aria-label="Project" className="mx-auto mt-5 flex max-w-[1400px] flex-wrap gap-1">
            {PROJECT_WORKSPACE_TABS.map((item) => {
              const href = `/projects/${project.id}/${item.href}`;
              const sectionActive = item.sections.some((slug) => {
                const p = `/projects/${project.id}/${slug}`;
                return pathname === p || pathname.startsWith(`${p}/`);
              });
              return (
                <Link
                  key={item.href}
                  href={href}
                  aria-current={sectionActive && !inStudio ? "page" : undefined}
                  className="px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
                  style={{
                    opacity: sectionActive && !inStudio ? 1 : 0.4,
                    background: sectionActive && !inStudio ? "rgba(255,255,255,0.06)" : "transparent",
                    borderBottom:
                      sectionActive && !inStudio
                        ? `2px solid ${opsProject?.color ?? "#fff"}`
                        : "2px solid transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={`/projects/${project.id}/feed`}
              aria-current={inStudio ? "page" : undefined}
              className="px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
              style={{
                opacity: inStudio ? 1 : 0.4,
                background: inStudio ? "rgba(255,255,255,0.06)" : "transparent",
                borderBottom: inStudio ? `2px solid ${opsProject?.color ?? "#fff"}` : "2px solid transparent",
              }}
            >
              Posts
            </Link>
          </nav>

          {!inStudio && activeTab ? (
            <SubNav projectId={project.id} items={subNavItems} pathname={pathname} />
          ) : null}

          {inStudio ? (
            <nav aria-label="Studio" className="mx-auto mt-2 flex max-w-[1400px] flex-wrap gap-3 border-t border-white/5 pt-2">
              {PROJECT_STUDIO_TABS.map((item) => {
                const href = `/projects/${project.id}/${item.href}`;
                const active =
                  pathname === href || (item.href === "posts" && pathname.includes("/posts/"));
                return (
                  <Link
                    key={item.href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className="text-[10px] tracking-[0.12em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
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
