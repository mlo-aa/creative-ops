"use client";

import Link from "next/link";
import { btnGhost, btnPrimary } from "@/core/ui/OpsField";

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-2xl py-4">
      <Link href="/projects" className="text-xs tracking-[0.14em] uppercase opacity-50">
        ← Projects
      </Link>
      <h1 className="mt-6 text-3xl tracking-[-0.04em]" style={{ fontWeight: 500 }}>
        New project
      </h1>
      <p className="mt-3 text-sm opacity-50">
        A project is context — not just a card. Choose how much setup you need right now.
      </p>

      <div className="mt-12 space-y-4">
        <article className="border border-white/10 p-6">
          <h2 className="text-lg">Quick project</h2>
          <p className="mt-2 text-sm opacity-50">
            Name, client, type, deadline. Create immediately and enrich later.
          </p>
          <Link href="/projects/new/quick" className={`${btnPrimary} mt-4 inline-block`}>
            Quick setup
          </Link>
        </article>

        <article className="border border-white/10 p-6" style={{ borderColor: "rgba(126, 203, 168, 0.25)" }}>
          <h2 className="text-lg">Full project intake</h2>
          <p className="mt-2 text-sm opacity-50">
            8-step intake: brand context, sources, references, strategy, creative direction, channels. Save as draft anytime.
          </p>
          <Link href="/projects/new/intake" className={`${btnPrimary} mt-4 inline-block`}>
            Start intake
          </Link>
        </article>

        <article className="border border-white/10 p-6">
          <h2 className="text-lg">Import existing project</h2>
          <p className="mt-2 text-sm opacity-50">
            Start with website, files, social accounts, repo URL, and notes. Organize supplied context into sources.
          </p>
          <Link href="/projects/new/import" className={`${btnGhost} mt-4 inline-block`}>
            Import project
          </Link>
        </article>
      </div>
    </main>
  );
}
