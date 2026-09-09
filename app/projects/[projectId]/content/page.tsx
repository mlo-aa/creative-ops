"use client";

import { useStudio } from "@/core/store";
import type { ContentFormat, ContentPlatform, ContentStatus } from "@/core/ops/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnGhost, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";

export default function ProjectContentPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ops, getOpsProject, addContentItem, updateContentItem, deleteContentItem, createDesignFromContent } = useStudio();
  const op = getOpsProject(params.projectId);
  const items = ops.contentItems.filter((c) => c.projectId === params.projectId);
  const [form, setForm] = useState({
    title: "",
    platform: "instagram" as ContentPlatform,
    format: "post" as ContentFormat,
    publicationDate: "",
    status: "idea" as ContentStatus,
    caption: "",
    hashtags: "",
    notes: "",
  });

  return (
    <main className="px-6 py-8">
      <SectionHeader title="Content planning" />
      <p className="-mt-4 mb-8 text-sm opacity-50">Plan content — link to designs in the Posts studio.</p>

      <form
        className="mb-8 grid gap-3 border border-white/10 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          addContentItem({ ...form, projectId: params.projectId });
          setForm({ ...form, title: "", caption: "", hashtags: "", notes: "" });
        }}
      >
        <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="date" className={inputClass} value={form.publicationDate} onChange={(e) => setForm({ ...form, publicationDate: e.target.value })} />
        <select className={inputClass} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as ContentPlatform })}>
          {(["instagram", "linkedin", "x", "tiktok", "youtube", "newsletter", "blog", "other"] as const).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className={inputClass} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as ContentFormat })}>
          {(["post", "carousel", "reel", "story", "thread", "article", "video"] as const).map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <textarea className={`${inputClass} sm:col-span-2`} placeholder="Caption" rows={2} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
        <button type="submit" className={`${btnPrimary} sm:col-span-2`}>Add content item</button>
      </form>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="border border-white/10 p-4" style={{ borderLeftColor: op?.color, borderLeftWidth: 2 }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg">{item.title}</p>
                <p className="mt-1 text-xs opacity-45">
                  {item.platform} · {item.format} · {item.publicationDate || "No date"}
                </p>
                <StatusPill color={op?.color}>{item.status}</StatusPill>
              </div>
              <div className="flex gap-2">
                {item.relatedPostId ? (
                  <Link href={`/projects/${params.projectId}/posts/${item.relatedPostId}`} className={btnGhost}>
                    Open design
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => {
                      const postId = createDesignFromContent(item.id);
                      if (postId) router.push(`/projects/${params.projectId}/posts/${postId}`);
                    }}
                  >
                    Create design
                  </button>
                )}
                <button type="button" onClick={() => deleteContentItem(item.id)} className="text-[10px] uppercase opacity-35">Delete</button>
              </div>
            </div>
            <select
              className="mt-3 border border-white/10 bg-[#15171a] text-[10px] uppercase"
              value={item.status}
              onChange={(e) => updateContentItem(item.id, { status: e.target.value as ContentStatus })}
            >
              {(["idea", "draft", "design", "review", "scheduled", "published", "archived"] as const).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </main>
  );
}
