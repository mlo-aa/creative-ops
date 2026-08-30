"use client";

import { useStudio } from "@/core/store";
import { GLOBAL_NAV_GROUPS } from "@/core/ui/nav-config";
import { NavGroupSeparator } from "@/core/ui/workspace-ui";
import { CommandPalette } from "@/core/ui/CommandPalette";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

function isNavActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { saveStatus, syncStatus, cloudEnabled } = useStudio();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const inProjectStudio =
    pathname.includes("/projects/") &&
    (pathname.includes("/feed") ||
      pathname.includes("/posts/") ||
      pathname.endsWith("/posts") ||
      pathname.includes("/templates") ||
      pathname.includes("/assets") ||
      pathname.includes("/settings"));

  return (
    <div className="min-h-screen bg-[#111] text-[#f1f3f7]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#111]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 items-center gap-4 md:gap-5">
            <Link
              href="/"
              className="shrink-0 text-sm tracking-[-0.03em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
              style={{ fontWeight: 500 }}
            >
              Creative Ops
            </Link>
            <nav className="hidden items-center md:flex" aria-label="Main">
              {GLOBAL_NAV_GROUPS.map((group, gi) => (
                <div key={group.id} className="flex items-center">
                  {gi > 0 ? <NavGroupSeparator /> : null}
                  <div className="flex items-center gap-0.5" role="group" aria-label={group.label}>
                    {group.items.map((item) => {
                      const active = isNavActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className="rounded px-2.5 py-1.5 text-[11px] tracking-[0.12em] uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88]"
                          style={{
                            opacity: active ? 1 : 0.45,
                            background: active ? "rgba(255,255,255,0.06)" : "transparent",
                          }}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {(saveStatus !== "idle" || syncStatus !== "idle") ? (
              <span className="hidden text-[10px] tracking-[0.14em] uppercase opacity-40 sm:inline">
                {syncStatus === "offline"
                  ? "Offline"
                  : syncStatus === "unsynced"
                    ? "Unsynced"
                    : saveStatus === "saving" || syncStatus === "saving"
                      ? "Saving…"
                      : "Saved"}
                {cloudEnabled ? "" : " (local)"}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="hidden border border-white/15 px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ecb88] sm:block"
            >
              Search ⌘K
            </button>
          </div>
        </div>
      </header>
      <main className={inProjectStudio ? "" : "mx-auto max-w-[1400px] px-5 py-8"}>{children}</main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
