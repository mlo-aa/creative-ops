"use client";

import { useStudio } from "@/core/store";
import type { InspirationCategory } from "@/core/ops/types";
import { useState } from "react";
import { btnPrimary, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";

const CATS: InspirationCategory[] = [
  "typography", "color", "layout", "copy", "campaign", "photography", "motion", "brand", "website", "other",
];

export default function InspirationPage() {
  const { ops, addInspiration, deleteInspiration } = useStudio();
  const [filter, setFilter] = useState<InspirationCategory | "all">("all");
  const [form, setForm] = useState({
    title: "",
    url: "",
    imageSrc: "",
    category: "layout" as InspirationCategory,
    tags: "",
    notes: "",
    projectIds: [] as string[],
  });

  const items = ops.inspirations.filter((i) => filter === "all" || i.category === filter);

  return (
    <>
      <SectionHeader title="Inspiration" />
      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter("all")} className="text-[10px] uppercase opacity-50">All</button>
        {CATS.map((c) => (
          <button key={c} type="button" onClick={() => setFilter(c)} className="text-[10px] uppercase opacity-50">{c}</button>
        ))}
      </div>

      <form
        className="mb-8 grid gap-3 border border-white/10 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          addInspiration({
            title: form.title,
            url: form.url,
            imageSrc: form.imageSrc,
            category: form.category,
            tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
            notes: form.notes,
            projectIds: form.projectIds,
          });
          setForm({ title: "", url: "", imageSrc: "", category: "layout", tags: "", notes: "", projectIds: [] });
        }}
      >
        <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={inputClass} placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <input className={inputClass} placeholder="Image URL" value={form.imageSrc} onChange={(e) => setForm({ ...form, imageSrc: e.target.value })} />
        <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InspirationCategory })}>
          {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <textarea className={`${inputClass} sm:col-span-2`} placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" className={`${btnPrimary} sm:col-span-2`}>Add inspiration</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="border border-white/10 overflow-hidden">
            {item.imageSrc ? (
              <img src={item.imageSrc} alt="" className="h-40 w-full object-cover opacity-80" />
            ) : (
              <div className="flex h-40 items-center justify-center bg-white/5 text-xs opacity-30">No image</div>
            )}
            <div className="p-4">
              <p className="font-medium">{item.title}</p>
              <StatusPill>{item.category}</StatusPill>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-[#7ecba8]">{item.url}</a>
              ) : null}
              <button type="button" onClick={() => deleteInspiration(item.id)} className="mt-3 text-[10px] uppercase opacity-35">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
