"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/core/ui/CommandPalette";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/posts", label: "Posts" },
  { href: "/agenda", label: "Agenda" },
  { href: "/ideas", label: "Idea Map" },
  { href: "/inspiration", label: "Inspiration" },
  { href: "/clients", label: "Clients" },
  { href: "/proposals", label: "Proposals" },
];

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
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm tracking-[-0.03em]" style={{ fontWeight: 500 }}>
              Creative Ops
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded px-2.5 py-1.5 text-[11px] tracking-[0.12em] uppercase transition"
                    style={{
                      opacity: active ? 1 : 0.45,
                      background: active ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {(saveStatus !== "idle" || syncStatus !== "idle") ? (
              <span className="text-[10px] tracking-[0.14em] uppercase opacity-40">
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
              className="hidden border border-white/15 px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase opacity-50 sm:block"
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
