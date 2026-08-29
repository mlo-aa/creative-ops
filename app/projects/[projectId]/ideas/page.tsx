"use client";

import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AutosaveField, btnPrimary, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";

export default function ProjectIdeasPage() {
  const params = useParams<{ projectId: string }>();
  const { ops, addIdea, updateIdea, deleteIdea } = useStudio();
  const ideas = ops.ideas.filter((i) => i.projectId === params.projectId);
  const [title, setTitle] = useState("");

  return (
    <main className="px-6 py-8">
      <SectionHeader title="Ideas" />
      <form
        className="mb-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          addIdea({
            projectId: params.projectId,
            title: title.trim(),
            body: "",
            category: "",
            status: "idea",
            tags: [],
            onGlobalMap: false,
          });
          setTitle("");
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quick idea…"
          className={inputClass}
        />
        <button type="submit" className={btnPrimary}>
          Add
        </button>
      </form>
      <ul className="space-y-3">
        {ideas.map((idea) => (
          <li key={idea.id} className="border border-white/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <input
                className="flex-1 bg-transparent text-lg outline-none"
                value={idea.title}
                onChange={(e) => updateIdea(idea.id, { title: e.target.value })}
              />
              <select
                value={idea.status}
                onChange={(e) => updateIdea(idea.id, { status: e.target.value as typeof idea.status })}
                className="border border-white/10 bg-[#141414] px-2 py-1 text-[10px] uppercase"
              >
                {(["idea", "exploring", "approved", "discarded"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="mt-3 w-full resize-y bg-transparent text-sm opacity-70 outline-none"
              rows={2}
              value={idea.body}
              onChange={(e) => updateIdea(idea.id, { body: e.target.value })}
              placeholder="Notes…"
            />
            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] opacity-45">
                <input
                  type="checkbox"
                  checked={idea.onGlobalMap}
                  onChange={(e) => updateIdea(idea.id, { onGlobalMap: e.target.checked })}
                />
                Idea Map
              </label>
              <button
                type="button"
                onClick={() => deleteIdea(idea.id)}
                className="text-[10px] uppercase tracking-[0.12em] opacity-35 hover:opacity-80"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {ideas.length === 0 ? <p className="text-sm opacity-40">No ideas yet.</p> : null}
      </ul>
    </main>
  );
}
