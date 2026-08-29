"use client";

import { useStudio } from "@/core/store";
import { useParams } from "next/navigation";
import { useState } from "react";
import { btnPrimary, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";
import { useProject } from "@/core/project/context";

export default function ProjectPhasesPage() {
  const params = useParams<{ projectId: string }>();
  const project = useProject();
  const { ops, getOpsProject, addPhase, updatePhase, deletePhase } = useStudio();
  const op = getOpsProject(params.projectId);
  const phases = ops.phases.filter((p) => p.projectId === params.projectId);
  const [view, setView] = useState<"list" | "timeline">("list");
  const [form, setForm] = useState({ name: "", type: "design" as const, startDate: "", endDate: "", status: "pending" as const, notes: "" });

  return (
    <main className="px-6 py-8">
      <SectionHeader
        title="Phases"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => setView("list")} className="text-[10px] uppercase opacity-50">List</button>
            <button type="button" onClick={() => setView("timeline")} className="text-[10px] uppercase opacity-50">Timeline</button>
          </div>
        }
      />
      <form
        className="mb-8 grid gap-3 border border-white/10 p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          addPhase({ ...form, projectId: params.projectId });
          setForm({ name: "", type: "design", startDate: "", endDate: "", status: "pending", notes: "" });
        }}
      >
        <input className={inputClass} placeholder="Phase name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <input type="date" className={inputClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <button type="submit" className={`${btnPrimary} sm:col-span-3`}>Add phase</button>
      </form>

      {view === "timeline" ? (
        <div className="relative border-l-2 pl-6" style={{ borderColor: op?.color ?? "#6D758F" }}>
          {phases.map((phase) => (
            <div key={phase.id} className="relative mb-8">
              <span
                className="absolute -left-[31px] top-1 h-3 w-3 rounded-full"
                style={{ background: op?.color }}
              />
              <p className="font-medium">{phase.name}</p>
              <p className="text-xs opacity-45">{phase.startDate} → {phase.endDate}</p>
              <StatusPill color={op?.color}>{phase.status}</StatusPill>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {phases.map((phase) => (
            <li key={phase.id} className="border border-white/10 p-4">
              <div className="flex justify-between">
                <input
                  className="bg-transparent text-lg outline-none"
                  value={phase.name}
                  onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                />
                <select
                  value={phase.status}
                  onChange={(e) => updatePhase(phase.id, { status: e.target.value as typeof phase.status })}
                  className="border border-white/10 bg-[#141414] text-[10px] uppercase"
                >
                  {(["pending", "active", "review", "completed", "blocked"] as const).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => deletePhase(phase.id)} className="mt-2 text-[10px] uppercase opacity-35">Delete</button>
            </li>
          ))}
        </ul>
      )}
      <span className="hidden">{project.id}</span>
    </main>
  );
}
