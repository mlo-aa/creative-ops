"use client";

import { useStudio } from "@/core/store";
import { GLOBAL_NAV_GROUPS, isNavActive } from "@/core/ui/nav-config";
import { NavGroupSeparator } from "@/core/ui/workspace-ui";
import { BottomNav } from "@/core/ui/BottomNav";
import { CommandPalette } from "@/core/ui/CommandPalette";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const ACCENT = "var(--project-accent,#e4e0d4)";
const FOCUS_RING = `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[${ACCENT}]`;

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
    <div className="min-h-screen bg-[#0c0d0f] text-[#f2f1ed]">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0c0d0f]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-5 md:gap-6">
            <Link
              href="/"
              className={`shrink-0 rounded-md text-[15px] font-medium tracking-[-0.01em] ${FOCUS_RING}`}
            >
              Creative Ops
            </Link>
            <nav className="hidden items-center md:flex" aria-label="Main">
              {GLOBAL_NAV_GROUPS.map((group, gi) => (
                <div key={group.id} className="flex items-center">
                  {gi > 0 ? <NavGroupSeparator /> : null}
                  <div className="flex items-center gap-1" role="group" aria-label={group.label}>
                    {group.items.map((item) => {
                      const active = isNavActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`rounded-lg px-3.5 py-2.5 text-[13px] transition ${FOCUS_RING}`}
                          style={{
                            opacity: active ? 1 : 0.5,
                            background: active ? "rgba(255,255,255,0.07)" : "transparent",
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
            {syncStatus === "unsynced" ? (
              <Link
                href="/dev/migrate-local"
                className="hidden items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-200/90 sm:inline-flex"
                title="Some changes are not yet synced to cloud"
              >
                Sync issue
              </Link>
            ) : saveStatus !== "idle" || syncStatus !== "idle" ? (
              <span className="hidden text-[12px] text-white/40 sm:inline">
                {syncStatus === "offline"
                  ? "Offline"
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
              className={`hidden rounded-lg border border-white/12 px-3.5 py-2 text-[12px] text-white/55 sm:block ${FOCUS_RING}`}
            >
              Search ⌘K
            </button>
          </div>
        </div>
      </header>
      <main
        className={`${inProjectStudio ? "" : "mx-auto max-w-[1400px] px-5 py-8"} pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] md:pb-0`}
      >
        {children}
      </main>
      <BottomNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
