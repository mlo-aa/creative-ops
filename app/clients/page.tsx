"use client";

import { useStudio } from "@/core/store";
import Link from "next/link";
import { useState } from "react";
import { btnPrimary, inputClass, SectionHeader, StatusPill } from "@/core/ui/OpsField";

export default function ClientsPage() {
  const { ops, addClient, deleteClient } = useStudio();
  const [form, setForm] = useState({
    name: "",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
    status: "lead" as const,
  });

  return (
    <>
      <SectionHeader title="Clients" />
      <form
        className="mb-8 grid gap-3 border border-white/10 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          addClient(form);
          setForm({ name: "", company: "", contactName: "", email: "", phone: "", website: "", notes: "", status: "lead" });
        }}
      >
        <input className={inputClass} placeholder="Client name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputClass} placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={inputClass} placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        <button type="submit" className={`${btnPrimary} sm:col-span-2`}>Add client</button>
      </form>

      <ul className="space-y-4">
        {ops.clients.map((client) => {
          const projects = ops.projects.filter((p) => p.clientId === client.id || p.clientName === client.name);
          return (
            <li key={client.id} className="border border-white/10 p-5">
              <div className="flex justify-between">
                <div>
                  <p className="text-lg">{client.name}</p>
                  <p className="text-sm opacity-50">{client.company}</p>
                  <StatusPill>{client.status}</StatusPill>
                </div>
                <button type="button" onClick={() => deleteClient(client.id)} className="text-[10px] uppercase opacity-35">Delete</button>
              </div>
              <p className="mt-3 text-xs opacity-45">{client.email} · {client.website}</p>
              {projects.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {projects.map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}/ideas`} className="text-[10px] uppercase tracking-[0.12em] text-[#7ecba8]">
                      {p.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
