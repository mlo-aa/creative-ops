"use client";

import { CORE_TEMPLATE_LIST } from "@/core/templates/coreTemplates";
import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PostsPage() {
  const project = useProject();
  const { createPost } = useStudio();
  const router = useRouter();

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl tracking-[-0.03em]">Posts</h1>
      <p className="mt-2 max-w-xl text-sm opacity-55">
        Every composition in this project. Create a post from a core template, then edit it.
      </p>
      <div className="mt-8 grid gap-3">
        {project.posts.map((post) => (
          <Link
            key={post.id}
            href={`/projects/${project.id}/posts/${post.id}`}
            className="flex items-center justify-between border border-white/10 px-4 py-3"
          >
            <span>
              {post.number} — {post.title}
            </span>
            <span className="text-[11px] tracking-[0.12em] uppercase opacity-45">
              {post.status} · {post.kind} · {post.template}
            </span>
          </Link>
        ))}
      </div>
      <h2 className="mt-12 text-xs tracking-[0.16em] uppercase opacity-50">New from template</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CORE_TEMPLATE_LIST.map((template) => (
          <button
            key={template.id}
            type="button"
            className="border border-white/10 px-4 py-3 text-left"
            onClick={() => {
              const id = createPost(project.id, template.id, template.name, template.id.startsWith("who-") && template.id === "who-intro" ? "single" : "single");
              router.push(`/projects/${project.id}/posts/${id}`);
            }}
          >
            {template.name}
          </button>
        ))}
        <button
          type="button"
          className="border border-white/10 px-4 py-3 text-left"
          onClick={() => {
            const id = createPost(project.id, "who-intro", "New carousel", "carousel");
            router.push(`/projects/${project.id}/posts/${id}`);
          }}
        >
          New carousel
        </button>
      </div>
    </main>
  );
}
