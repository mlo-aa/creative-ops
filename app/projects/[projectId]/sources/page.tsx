"use client";

import { useStudio } from "@/core/store";
import type { SourceCategory, SourcePriority, SourceStatus, SourceType } from "@/core/ops/intake";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { btnPrimary, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";

const SOURCE_TYPES: SourceType[] = [
  "website", "landing_page", "social_profile", "figma", "github", "notion", "google_drive", "other_url", "file", "notes",
];

const CATEGORIES: SourceCategory[] = [
  "brandbook", "landing_page", "website", "product", "strategy", "research", "pitch_deck", "content_plan",
  "campaign", "competitor", "inspiration", "technical", "customer_research", "interview", "legal", "previous_version", "other",
];

export default function ProjectSourcesPage() {
  const params = useParams<{ projectId: string }>();
  const { ops, addSource, deleteSource, updateSource } = useStudio();
  const [filter, setFilter] = useState<SourceCategory | "all">("all");
  const [form, setForm] = useState({
    title: "",
    sourceType: "website" as SourceType,
    category: "other" as SourceCategory,
    url: "",
    content: "",
    description: "",
    tags: "",
    priority: "reference" as SourcePriority,
    status: "current" as SourceStatus,
    isSourceOfTruth: false,
  });

  const sources = ops.sources
    .filter((s) => s.projectId === params.projectId)
    .filter((s) => filter === "all" || s.category === filter);

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      addSource({
        projectId: params.projectId,
        title: file.name,
        sourceType: "file",
        category: form.category,
        url: "",
        fileData: String(reader.result ?? ""),
        fileName: file.name,
        fileMime: file.type,
        content: "",
        description: form.description,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        priority: form.priority,
        status: form.status,
        isSourceOfTruth: form.isSourceOfTruth,
        supersededBy: "",
        extractedText: "",
        notes: "",
        relatedDecisionIds: [],
        relatedContentIds: [],
        relatedDeliverableIds: [],
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <SectionHeader title="Sources" />
      <p className="-mt-4 mb-8 text-sm opacity-50">
        Important project material — richer than links. Brandbooks, docs, URLs, files, notes.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter("all")} className="text-[10px] uppercase opacity-50">All</button>
        {CATEGORIES.map((c) => (
          <button key={c} type="button" onClick={() => setFilter(c)} className="text-[10px] uppercase opacity-50">{c.replace("_", " ")}</button>
        ))}
      </div>

      <form
        className="mb-8 grid gap-3 border border-white/10 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          addSource({
            projectId: params.projectId,
            title: form.title,
            sourceType: form.sourceType,
            category: form.category,
            url: form.url,
            fileData: "",
            fileName: "",
            fileMime: "",
            content: form.content,
            description: form.description,
            tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
            priority: form.priority,
            status: form.status,
            isSourceOfTruth: form.isSourceOfTruth,
            supersededBy: "",
            extractedText: form.content.slice(0, 2000),
            notes: "",
            relatedDecisionIds: [],
            relatedContentIds: [],
            relatedDeliverableIds: [],
          });
          setForm({ ...form, title: "", url: "", content: "", description: "", tags: "" });
        }}
      >
        <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <select className={inputClass} value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as SourceType })}>
          {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
        <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SourceCategory })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
        <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as SourcePriority })}>
          {(["primary", "important", "reference", "archive"] as const).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {form.sourceType === "notes" ? (
          <textarea className={`${inputClass} sm:col-span-2`} placeholder="Pasted notes" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        ) : form.sourceType === "file" ? (
          <input type="file" className="sm:col-span-2" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.svg" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
        ) : (
          <input className={`${inputClass} sm:col-span-2`} placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        )}
        <textarea className={`${inputClass} sm:col-span-2`} placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input type="checkbox" checked={form.isSourceOfTruth} onChange={(e) => setForm({ ...form, isSourceOfTruth: e.target.checked })} />
          Source of truth
        </label>
        <button type="submit" className={`${btnPrimary} sm:col-span-2`}>Add source</button>
      </form>

      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.id} className="border border-white/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link href={`/projects/${params.projectId}/sources/${s.id}`} className="font-medium text-[var(--project-accent,#e4e0d4)]">
                  {s.title}
                </Link>
                <div className="mt-1 flex flex-wrap gap-2">
                  <StatusPill>{s.category.replace("_", " ")}</StatusPill>
                  <StatusPill>{s.priority}</StatusPill>
                  {s.isSourceOfTruth ? <StatusPill color="var(--project-accent,#e4e0d4)">Source of truth</StatusPill> : null}
                  {s.status === "superseded" ? <StatusPill>Superseded</StatusPill> : null}
                </div>
                {s.description ? <p className="mt-2 text-sm opacity-50">{s.description}</p> : null}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs opacity-40">{s.url}</a>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <select
                  className="border border-white/10 bg-transparent text-[10px] uppercase"
                  value={s.status}
                  onChange={(e) => updateSource(s.id, { status: e.target.value as SourceStatus })}
                >
                  {(["current", "superseded", "archived"] as const).map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
                <button type="button" onClick={() => deleteSource(s.id)} className="text-[10px] uppercase opacity-35">Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
