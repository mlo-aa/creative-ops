"use client";

import { ProjectScope } from "@/core/project/context";
import { useStudio } from "@/core/store";
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
import type { CSSProperties, ReactNode } from "react";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--project-accent,#e4e0d4)]";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const { ready, getProject, getOpsProject } = useStudio();
  const project = getProject(params.projectId);
  const opsProject = getOpsProject(params.projectId);
  const inStudio = isProjectStudioPath(pathname, params.projectId);
  const activeTab = activeProjectTab(pathname, params.projectId);
  const subNavItems = activeTab ? projectSectionSubNav(activeTab.sections) : [];

  if (!ready) return <p className="p-10 opacity-50">Loading…</p>;
  if (!project) {
    return (
      <main className="p-10">
        <Link href="/projects" className="text-sm opacity-50">
          ← Projects
        </Link>
        <p className="mt-6">Project not found.</p>
      </main>
    );
  }

  const accentVars = { "--project-accent": opsProject?.color ?? "#e4e0d4" } as CSSProperties;

  return (
    <ProjectScope project={project}>
      <div className="min-h-screen" style={accentVars}>
        <header className="border-b border-white/8 px-6 py-5">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/projects" className={`rounded-md text-[13px] opacity-45 ${FOCUS_RING}`}>
                ← Projects
              </Link>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                {opsProject ? (
                  <span className="text-[13px] font-medium" style={{ color: opsProject.color }}>
                    {opsProject.code}
                  </span>
                ) : null}
                <h1 className="text-xl font-semibold tracking-[-0.01em]">{project.name}</h1>
                {opsProject ? (
                  <span className="text-[13px] text-white/40">
                    {opsProject.clientName}, {(opsProject.types ?? [opsProject.type]).join(", ")}, {opsProject.status}
                  </span>
                ) : null}
              </div>
              {project.campaign ? <p className="mt-1 text-[13px] text-white/35">{project.campaign}</p> : null}
            </div>
          </div>

          <nav aria-label="Project" className="mx-auto mt-5 flex max-w-[1400px] flex-wrap gap-1">
            {PROJECT_WORKSPACE_TABS.map((item) => {
              const href = `/projects/${project.id}/${item.href}`;
              const sectionActive = item.sections.some((section) => {
                const p = `/projects/${project.id}/${section.slug}`;
                return pathname === p || pathname.startsWith(`${p}/`);
              });
              const isActive = sectionActive && !inStudio;
              return (
                <Link
                  key={item.href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-lg px-4 py-2.5 text-[13px] transition ${FOCUS_RING}`}
                  style={{
                    opacity: isActive ? 1 : 0.5,
                    background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                    color: isActive ? (opsProject?.color ?? undefined) : undefined,
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={`/projects/${project.id}/feed`}
              aria-current={inStudio ? "page" : undefined}
              className={`rounded-lg px-4 py-2.5 text-[13px] transition ${FOCUS_RING}`}
              style={{
                opacity: inStudio ? 1 : 0.5,
                background: inStudio ? "rgba(255,255,255,0.07)" : "transparent",
                color: inStudio ? (opsProject?.color ?? undefined) : undefined,
              }}
            >
              Posts
            </Link>
          </nav>

          {!inStudio && activeTab ? (
            <SubNav projectId={project.id} items={subNavItems} pathname={pathname} />
          ) : null}

          {inStudio ? (
            <nav aria-label="Studio" className="mx-auto mt-2 flex max-w-[1400px] flex-wrap gap-4 border-t border-white/6 pt-2.5">
              {PROJECT_STUDIO_TABS.map((item) => {
                const href = `/projects/${project.id}/${item.href}`;
                const active = pathname === href || (item.href === "posts" && pathname.includes("/posts/"));
                return (
                  <Link
                    key={item.href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md text-[13px] ${FOCUS_RING}`}
                    style={{ opacity: active ? 0.95 : 0.4 }}
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
