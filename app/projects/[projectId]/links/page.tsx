"use client";

import { useStudio } from "@/core/store";
import type { LinkType } from "@/core/ops/types";
import { useParams } from "next/navigation";
import { useState } from "react";
import { btnPrimary, inputClass, SectionHeader } from "@/core/ui/OpsField";

const TYPES: LinkType[] = ["reference", "brief", "inspiration", "tool", "research", "client", "asset", "other"];

export default function ProjectLinksPage() {
  const params = useParams<{ projectId: string }>();
  const { ops, addLink, deleteLink } = useStudio();
  const [filter, setFilter] = useState<LinkType | "all">("all");
  const links = ops.links.filter(
    (l) => l.projectId === params.projectId && (filter === "all" || l.type === filter),
  );
  const [form, setForm] = useState({ title: "", url: "", type: "reference" as LinkType, description: "" });

  return (
    <main className="px-6 py-8">
      <SectionHeader title="Links" />
      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter("all")} className="text-[10px] uppercase opacity-50">
          All
        </button>
        {TYPES.map((t) => (
          <button key={t} type="button" onClick={() => setFilter(t)} className="text-[10px] uppercase opacity-50">
            {t}
          </button>
        ))}
      </div>
      <form
        className="mb-8 grid gap-3 border border-white/10 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title || !form.url) return;
          addLink({ ...form, projectId: params.projectId });
          setForm({ title: "", url: "", type: "reference", description: "" });
        }}
      >
        <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={inputClass} placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LinkType })}>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input className={inputClass} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button type="submit" className={`${btnPrimary} sm:col-span-2`}>Save link</button>
      </form>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.id} className="flex items-start justify-between gap-4 border border-white/10 p-4">
            <div>
              <p className="font-medium">{link.title}</p>
              <a href={link.url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-[#7ecba8] opacity-80">
                {link.url}
              </a>
              <p className="mt-2 text-xs opacity-45">{link.type} · {link.description}</p>
            </div>
            <button type="button" onClick={() => deleteLink(link.id)} className="text-[10px] uppercase opacity-35">Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
