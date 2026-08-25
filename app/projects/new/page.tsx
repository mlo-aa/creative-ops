"use client";

import { FORMAT_PRESETS } from "@/core/formats";
import { useStudio } from "@/core/store";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewProjectPage() {
  const { createProject } = useStudio();
  const router = useRouter();
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [primary, setPrimary] = useState("#171918");
  const [background, setBackground] = useState("#F4F1E8");
  const [text, setText] = useState("#171918");
  const [accent, setAccent] = useState("#B7E46C");
  const [formatId, setFormatId] = useState("instagram-portrait");
  const [logoSrc, setLogoSrc] = useState("");

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <a href="/" className="text-xs tracking-[0.14em] uppercase opacity-50">
        ← Projects
      </a>
      <h1 className="mt-6 text-3xl tracking-[-0.04em]" style={{ fontWeight: 450 }}>
        New project
      </h1>
      <form
        className="mt-10 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          const id = createProject({
            name: name || brandName || "Untitled",
            brandName: brandName || name || "Brand",
            primary,
            background,
            text,
            accent,
            logoSrc: logoSrc || undefined,
            formatId,
          });
          router.push(`/projects/${id}/brand`);
        }}
      >
        <Field label="Project name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Brand name">
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} className={inputClass} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary">
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </Field>
          <Field label="Background">
            <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} />
          </Field>
          <Field label="Text">
            <input type="color" value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Field label="Accent">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
          </Field>
        </div>
        <Field label="Default format">
          <select value={formatId} onChange={(e) => setFormatId(e.target.value)} className={inputClass}>
            {FORMAT_PRESETS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name} · {format.width}×{format.height}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Logo">
          <input
            type="file"
            accept="image/*,.svg"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") setLogoSrc(reader.result);
              };
              reader.readAsDataURL(file);
            }}
          />
        </Field>
        <button type="submit" className="mt-4 h-12 border border-white/25 px-5 text-sm tracking-[0.08em] uppercase">
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

const inputClass =
  "w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f4f1ea]";
