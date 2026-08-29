"use client";

import { useStudio } from "@/core/store";
import type { ProposalStatus } from "@/core/ops/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnGhost, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";

const STATUSES: ProposalStatus[] = ["draft", "sent", "viewed", "negotiation", "accepted", "rejected", "expired"];

export default function ProposalsPage() {
  const { ops, addProposal, updateProposal, createProjectFromProposal } = useStudio();
  const router = useRouter();
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    projectType: "social" as const,
    value: 0,
    currency: "USD",
    date: new Date().toISOString().slice(0, 10),
    status: "draft" as ProposalStatus,
    notes: "",
    externalLink: "",
    expirationDate: "",
  });

  return (
    <>
      <SectionHeader
        title="Proposals"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => setView("kanban")} className="text-[10px] uppercase opacity-50">Kanban</button>
            <button type="button" onClick={() => setView("list")} className="text-[10px] uppercase opacity-50">List</button>
          </div>
        }
      />

      <form
        className="mb-8 grid gap-3 border border-white/10 p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          addProposal(form);
          setForm({ ...form, title: "", notes: "" });
        }}
      >
        <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={inputClass} placeholder="Client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
        <input type="number" className={inputClass} placeholder="Value" value={form.value || ""} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
        <button type="submit" className={`${btnPrimary} sm:col-span-3`}>Add proposal</button>
      </form>

      {view === "kanban" ? (
        <div className="grid gap-4 overflow-x-auto lg:grid-cols-4">
          {STATUSES.slice(0, 4).map((status) => (
            <div key={status} className="min-w-[200px]">
              <h3 className="mb-3 text-[10px] tracking-[0.16em] uppercase opacity-45">{status}</h3>
              <ul className="space-y-2">
                {ops.proposals.filter((p) => p.status === status).map((p) => (
                  <li key={p.id} className="border border-white/10 p-3">
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs opacity-45">{p.clientName}</p>
                    <p className="mt-1 text-xs">{p.currency} {p.value}</p>
                    <select
                      className="mt-2 w-full border border-white/10 bg-[#141414] text-[10px] uppercase"
                      value={p.status}
                      onChange={(e) => updateProposal(p.id, { status: e.target.value as ProposalStatus })}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {p.status === "accepted" ? (
                      <button
                        type="button"
                        className={`${btnGhost} mt-2 w-full`}
                        onClick={() => {
                          const id = createProjectFromProposal(p.id);
                          if (id) router.push(`/projects/${id}/ideas`);
                        }}
                      >
                        Create project
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {ops.proposals.map((p) => (
            <li key={p.id} className="flex items-center justify-between border border-white/10 px-4 py-3">
              <span>{p.title} · {p.clientName}</span>
              <StatusPill>{p.status}</StatusPill>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
