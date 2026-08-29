"use client";

import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { NewDesignModal } from "@/core/ui/NewDesignModal";
import { btnPrimary } from "@/core/ui/OpsField";
import Link from "next/link";
import { useState } from "react";

export default function PostsPage() {
  const project = useProject();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.03em]">Designs</h1>
          <p className="mt-2 max-w-xl text-sm opacity-55">
            Editable design documents — blank, template, or AI-generated. Open any design in the Post Designer.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setModalOpen(true)}>
          + New design
        </button>
      </div>

      <div className="mt-8 grid gap-3">
        {project.posts.map((post) => (
          <Link
            key={post.id}
            href={`/projects/${project.id}/posts/${post.id}`}
            className="flex items-center justify-between border border-white/10 px-4 py-3 hover:border-white/25"
          >
            <span>
              {post.number} — {post.title}
            </span>
            <span className="text-[11px] tracking-[0.12em] uppercase opacity-45">
              {post.status} · {post.kind} · {post.template}
              {post.document ? " · document" : ""}
              {post.exportKind === "gif" ? " · gif" : ""}
            </span>
          </Link>
        ))}
      </div>

      <NewDesignModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  );
}
