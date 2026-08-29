"use client";

import { useStudio } from "@/core/store";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { btnPrimary, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";

export default function ProjectDeliverablesPage() {
  const params = useParams<{ projectId: string }>();
  const { ops, getOpsProject, addDeliverable, updateDeliverable, deleteDeliverable } = useStudio();
  const op = getOpsProject(params.projectId);
  const items = ops.deliverables.filter((d) => d.projectId === params.projectId);
  const [form, setForm] = useState({ name: "", type: "post" as const, status: "pending" as const, deadline: "", notes: "" });

  const grouped = items.reduce(
    (acc, d) => {
      acc[d.status] = [...(acc[d.status] ?? []), d];
      return acc;
    },
    {} as Record<string, typeof items>,
  );

  return (
    <main className="px-6 py-8">
      <SectionHeader title="Deliverables" />
      <form
        className="mb-8 grid gap-3 border border-white/10 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          addDeliverable({ ...form, projectId: params.projectId });
          setForm({ name: "", type: "post", status: "pending", deadline: "", notes: "" });
        }}
      >
        <input className={inputClass} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input type="date" className={inputClass} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        <button type="submit" className={`${btnPrimary} sm:col-span-2`}>Add deliverable</button>
      </form>
      <div className="grid gap-6 lg:grid-cols-3">
        {(["pending", "in_progress", "review", "approved", "delivered"] as const).map((status) => (
          <div key={status}>
            <h3 className="mb-3 text-[10px] tracking-[0.16em] uppercase opacity-45">{status.replace("_", " ")}</h3>
            <ul className="space-y-2">
              {(grouped[status] ?? []).map((d) => (
                <li key={d.id} className="border border-white/10 p-3" style={{ borderLeftColor: op?.color, borderLeftWidth: 2 }}>
                  <p className="text-sm font-medium">{d.name}</p>
                  {d.deadline ? <p className="text-[10px] opacity-40">{d.deadline}</p> : null}
                  {d.relatedPostId ? (
                    <Link href={`/projects/${params.projectId}/posts/${d.relatedPostId}`} className="text-[10px] text-[#7ecba8]">
                      View design
                    </Link>
                  ) : null}
                  <button type="button" onClick={() => deleteDeliverable(d.id)} className="mt-2 block text-[10px] uppercase opacity-30">Delete</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
