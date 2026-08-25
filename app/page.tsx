"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";

export default function HomePage() {
  const { ready, projects } = useStudio();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <p className="text-xs tracking-[0.18em] uppercase opacity-50">Internal tool</p>
      <h1 className="mt-4 text-4xl tracking-[-0.04em]" style={{ fontWeight: 450 }}>
        Content Studio
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed opacity-60">
        A small branded content operating system. Pick a project, plan the feed, edit
        compositions, and export posts without leaving the brand system.
      </p>

      <div className="mt-12 flex items-end justify-between">
        <h2 className="text-xs tracking-[0.16em] uppercase opacity-50">Projects</h2>
        <Link href="/projects/new" className="text-xs tracking-[0.12em] uppercase opacity-70">
          + New project
        </Link>
      </div>

      {!ready ? (
        <p className="mt-8 opacity-50">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const active = project.posts.filter((post) => post.status === "active").length;
            const drafts = project.posts.filter((post) => post.status === "draft").length;
            const carousels = project.posts.filter((post) => post.kind === "carousel").length;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}/feed`}
                className="border border-white/10 p-6 transition hover:border-white/30"
              >
                <p className="text-xl tracking-[-0.03em]">{project.name}</p>
                <p className="mt-2 text-sm opacity-50">{project.brand.tagline || project.brand.description}</p>
                <p className="mt-6 text-xs tracking-[0.12em] uppercase opacity-45">
                  {active} posts · {drafts} drafts · {carousels} carousel
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
