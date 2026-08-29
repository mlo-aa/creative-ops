"use client";

import { useStudio } from "@/core/store";
import type { ReferenceCategory } from "@/core/ops/intake";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AutosaveField, btnPrimary, btnGhost, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";

const CATEGORIES: ReferenceCategory[] = [
  "competitor", "benchmark", "visual", "product", "campaign", "website", "social_feed", "motion", "copy", "brand",
];

export default function ProjectReferencesPage() {
  const params = useParams<{ projectId: string }>();
  const { ops, addReference, deleteReference, addReferenceBoard, addDecision, updateKnowledge, getKnowledge } = useStudio();
  const knowledge = getKnowledge(params.projectId);

  const references = ops.references.filter((r) => r.projectId === params.projectId);
  const boards = ops.referenceBoards.filter((b) => b.projectId === params.projectId);
  const decisions = ops.decisions.filter((d) => d.projectId === params.projectId);

  const [boardName, setBoardName] = useState("");
  const [form, setForm] = useState({
    title: "",
    url: "",
    boardId: "",
    category: "visual" as ReferenceCategory,
    whatWeLike: "",
    whatNotToCopy: "",
  });
  const [decForm, setDecForm] = useState({ decision: "", rationale: "", area: "brand" as const });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <SectionHeader title="References" />
      <p className="-mt-4 mb-8 text-sm opacity-50">
        Study and comparison material with context — why it matters and what not to copy.
      </p>

      <section className="mb-10 border border-white/10 p-4">
        <h3 className="text-[10px] tracking-[0.16em] uppercase opacity-45">Reference boards</h3>
        <div className="mt-3 flex gap-2">
          <input className={inputClass} placeholder="Board name (e.g. Instagram direction)" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
          <button type="button" className={btnGhost} onClick={() => { if (boardName) { addReferenceBoard({ projectId: params.projectId, name: boardName, description: "" }); setBoardName(""); } }}>Add board</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {boards.map((b) => (
            <StatusPill key={b.id}>{b.name}</StatusPill>
          ))}
        </div>
      </section>

      <form
        className="mb-8 grid gap-3 border border-white/10 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          addReference({
            projectId: params.projectId,
            boardId: form.boardId,
            title: form.title,
            url: form.url,
            imageSrc: "",
            category: form.category,
            whatWeLike: form.whatWeLike,
            whatNotToCopy: form.whatNotToCopy,
            tags: [],
            notes: "",
          });
          setForm({ title: "", url: "", boardId: "", category: "visual", whatWeLike: "", whatNotToCopy: "" });
        }}
      >
        <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className={inputClass} placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <select className={inputClass} value={form.boardId} onChange={(e) => setForm({ ...form, boardId: e.target.value })}>
          <option value="">No board</option>
          {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ReferenceCategory })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
        <textarea className={inputClass} placeholder="What we like" rows={3} value={form.whatWeLike} onChange={(e) => setForm({ ...form, whatWeLike: e.target.value })} />
        <textarea className={inputClass} placeholder="Do NOT copy" rows={3} value={form.whatNotToCopy} onChange={(e) => setForm({ ...form, whatNotToCopy: e.target.value })} />
        <button type="submit" className={btnPrimary}>Add reference</button>
      </form>

      <div className="mb-10 space-y-4">
        {references.map((r) => {
          const board = boards.find((b) => b.id === r.boardId);
          return (
            <article key={r.id} className="border border-white/10 p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{r.title}</p>
                  {board ? <StatusPill>{board.name}</StatusPill> : null}
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-[#7ecba8]">{r.url}</a> : null}
                </div>
                <button type="button" onClick={() => deleteReference(r.id)} className="text-[10px] uppercase opacity-35">Delete</button>
              </div>
              {r.whatWeLike ? <p className="mt-3 text-sm"><span className="opacity-45">Like:</span> {r.whatWeLike}</p> : null}
              {r.whatNotToCopy ? <p className="mt-1 text-sm"><span className="opacity-45">Avoid:</span> {r.whatNotToCopy}</p> : null}
            </article>
          );
        })}
      </div>

      <section className="border-t border-white/10 pt-10">
        <h3 className="mb-4 text-xs tracking-[0.16em] uppercase opacity-45">Decision log</h3>
        <form
          className="mb-6 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            addDecision({
              projectId: params.projectId,
              decision: decForm.decision,
              rationale: decForm.rationale,
              date: new Date().toISOString().slice(0, 10),
              status: "current",
              area: decForm.area,
              sourceId: "",
              person: "",
              supersededBy: "",
            });
            setDecForm({ decision: "", rationale: "", area: "brand" });
          }}
        >
          <input className={inputClass} placeholder="Decision" value={decForm.decision} onChange={(e) => setDecForm({ ...decForm, decision: e.target.value })} />
          <input className={inputClass} placeholder="Rationale" value={decForm.rationale} onChange={(e) => setDecForm({ ...decForm, rationale: e.target.value })} />
          <button type="submit" className={`${btnPrimary} sm:col-span-2`}>Log decision</button>
        </form>
        <ul className="space-y-3">
          {decisions.map((d) => (
            <li key={d.id} className="border-l-2 border-white/20 pl-4">
              <p className="text-sm font-medium">{d.decision}</p>
              <p className="text-xs opacity-50">{d.rationale}</p>
              <StatusPill>{d.area}</StatusPill>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-white/10 pt-10">
        <h3 className="mb-4 text-xs tracking-[0.16em] uppercase opacity-45">Knowledge notes</h3>
        <div className="space-y-6">
          <AutosaveField label="Confirmed facts" value={knowledge.confirmedFacts} onSave={(v) => updateKnowledge(params.projectId, { confirmedFacts: v })} rows={4} />
          <AutosaveField label="Open questions" value={knowledge.openQuestions} onSave={(v) => updateKnowledge(params.projectId, { openQuestions: v })} rows={3} />
          <AutosaveField label="Assumptions" value={knowledge.assumptions} onSave={(v) => updateKnowledge(params.projectId, { assumptions: v })} rows={3} />
          <AutosaveField label="Avoid / Do not use" value={knowledge.avoidDoNotUse} onSave={(v) => updateKnowledge(params.projectId, { avoidDoNotUse: v })} rows={4} />
          <AutosaveField label="Terminology" value={knowledge.terminology} onSave={(v) => updateKnowledge(params.projectId, { terminology: v })} rows={3} />
        </div>
      </section>
    </main>
  );
}
