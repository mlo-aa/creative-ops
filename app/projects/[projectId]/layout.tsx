"use client";

import { ProjectScope } from "@/core/project/context";
import { useStudio } from "@/core/store";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "feed", label: "Feed" },
  { href: "posts", label: "Posts" },
  { href: "templates", label: "Templates" },
  { href: "assets", label: "Assets" },
  { href: "brand", label: "Brand" },
  { href: "settings", label: "Settings" },
];

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const { ready, getProject } = useStudio();
  const project = getProject(params.projectId);

  if (!ready) {
    return <p className="p-10 opacity-50">Loading…</p>;
  }
  if (!project) {
    return (
      <main className="p-10">
        <Link href="/" className="text-xs uppercase tracking-[0.14em] opacity-50">
          ← Projects
        </Link>
        <p className="mt-6">Project not found.</p>
      </main>
    );
  }

  return (
    <ProjectScope project={project}>
      <div className="min-h-screen">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs tracking-[0.14em] uppercase opacity-45">
              Studio
            </Link>
            <span className="opacity-20">/</span>
            <p className="text-sm tracking-[-0.02em]">{project.name}</p>
          </div>
          <nav className="flex flex-wrap gap-4">
            {NAV.map((item) => {
              const href = `/projects/${project.id}/${item.href}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={item.href}
                  href={href}
                  className="text-[11px] tracking-[0.14em] uppercase"
                  style={{ opacity: active ? 1 : 0.45 }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
      </div>
    </ProjectScope>
  );
}
