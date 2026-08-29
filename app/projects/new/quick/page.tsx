"use client";

import { FORMAT_PRESETS } from "@/core/formats";
import { useStudio } from "@/core/store";
import type { ProjectType } from "@/core/ops/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, inputClass } from "@/core/ui/OpsField";

const TYPES: ProjectType[] = [
  "branding", "social", "campaign", "website", "landing_page", "product",
  "strategy", "content", "launch", "pitch_deck", "internal", "other",
];

export default function QuickProjectPage() {
  const { createOpsProject, ops } = useStudio();
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<ProjectType>("social");
  const [color, setColor] = useState("#149A9B");
  const [deadline, setDeadline] = useState("");
  const [formatId, setFormatId] = useState("instagram-portrait");

  return (
    <main className="mx-auto max-w-xl py-4">
      <Link href="/projects/new" className="text-xs tracking-[0.14em] uppercase opacity-50">
        ← New project
      </Link>
      <h1 className="mt-6 text-3xl tracking-[-0.04em]" style={{ fontWeight: 500 }}>
        Quick project
      </h1>
      <form
        className="mt-10 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const id = createOpsProject({
            name: name || "Untitled",
            clientName: clientName || name,
            clientId: clientId || undefined,
            type,
            types: [type],
            color,
            deadline: deadline || undefined,
            formatId,
            status: "active",
          });
          router.push(`/projects/${id}/overview`);
        }}
      >
        <Field label="Project name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Client / brand">
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
          {ops.clients.length ? (
            <select
              className={`${inputClass} mt-2`}
              value={clientId}
              onChange={(e) => {
                const c = ops.clients.find((x) => x.id === e.target.value);
                setClientId(e.target.value);
                if (c) setClientName(c.name);
              }}
            >
              <option value="">Link existing client…</option>
              {ops.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : null}
        </Field>
        <Field label="Project type">
          <select value={type} onChange={(e) => setType(e.target.value as ProjectType)} className={inputClass}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Project color">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
        <Field label="Deadline">
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Default format">
          <select value={formatId} onChange={(e) => setFormatId(e.target.value)} className={inputClass}>
            {FORMAT_PRESETS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name} · {format.width}×{format.height}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className={btnPrimary}>
          Create project
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] tracking-[0.14em] uppercase opacity-50">{label}</span>
      {children}
    </label>
  );
}
