"use client";

import { useStudio } from "@/core/store";
import { GLOBAL_NAV_GROUPS, isNavActive } from "@/core/ui/nav-config";
import { ArrowLeft, Calendar, FolderKanban, Home, Network, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

const ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  "/": Home,
  "/projects": FolderKanban,
  "/agenda": Calendar,
  "/ideas": Network,
  "/inspiration": Sparkles,
};

const ITEMS = GLOBAL_NAV_GROUPS.flatMap((group) => group.items);

const BAR_STYLE = {
  background: "var(--studio-bg)",
  borderTop: "0.5px solid var(--studio-line)",
  height: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom))",
  paddingBottom: "env(safe-area-inset-bottom)",
} as const;

/**
 * Mobile-only primary nav (<768px). The existing top nav (md:flex in
 * AppShell) already covers iPad/desktop — this doesn't touch it.
 *
 * Rendered outside any project's ProjectScope, so it can't rely on the
 * --project-accent CSS var cascading down from the project layout — it
 * looks the project's own color up directly from the store instead.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { getOpsProject } = useStudio();

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch && projectMatch[1] !== "new" ? projectMatch[1] : null;

  if (projectId) {
    const opsProject = getOpsProject(projectId);
    const accent = opsProject?.color ?? "#e4e0d4";
    return (
      <nav aria-label="Project (mobile)" className="fixed inset-x-0 bottom-0 z-40 flex items-stretch md:hidden" style={BAR_STYLE}>
        <Link
          href="/projects"
          aria-label="Back to projects"
          className="flex w-14 shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: accent, outlineColor: accent }}
        >
          <ArrowLeft size={22} />
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
          {opsProject ? (
            <span className="shrink-0 text-[12px] font-medium" style={{ color: accent }}>
              {opsProject.code}
            </span>
          ) : null}
          <span className="truncate text-[15px] font-medium text-[#f2f1ed]">
            {opsProject?.name ?? "Project"}
          </span>
        </div>
        <div className="w-14 shrink-0" aria-hidden />
      </nav>
    );
  }

  return (
    <nav aria-label="Primary (mobile)" className="fixed inset-x-0 bottom-0 z-40 flex md:hidden" style={BAR_STYLE}>
      {ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href);
        const Icon = ICONS[item.href] ?? Home;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--project-accent,#e4e0d4)]"
            style={{ color: active ? "var(--project-accent,#e4e0d4)" : "rgba(242,241,237,0.45)" }}
          >
            <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
            <span className="hidden text-[10px] leading-none min-[375px]:block">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
