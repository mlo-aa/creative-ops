"use client";

import { useEffect, useState } from "react";

export function AutosaveField({
  label,
  value,
  onSave,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (local !== value) onSave(local);
    }, 600);
    return () => window.clearTimeout(t);
  }, [local, value, onSave]);

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] tracking-[0.14em] uppercase opacity-45">{label}</span>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y border border-white/10 bg-[#141414] px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-white/25"
      />
    </label>
  );
}

export function AutosaveInput({
  label,
  value,
  onSave,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (local !== value) onSave(local);
    }, 600);
    return () => window.clearTimeout(t);
  }, [local, value, onSave]);

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] tracking-[0.14em] uppercase opacity-45">{label}</span>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-white/10 bg-[#141414] px-3 py-2 text-sm outline-none focus:border-white/25"
      />
    </label>
  );
}

export function StatusPill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase"
      style={{
        border: `1px solid ${color ?? "rgba(255,255,255,0.2)"}`,
        color: color ?? "inherit",
        opacity: 0.85,
      }}
    >
      {children}
    </span>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h1 className="text-2xl tracking-[-0.03em]" style={{ fontWeight: 500 }}>
        {title}
      </h1>
      {action}
    </div>
  );
}

export const btnPrimary =
  "inline-flex h-9 items-center border border-[#3d8f6a] bg-[#2a6b4f]/30 px-4 text-[11px] tracking-[0.12em] uppercase text-[#b8e6cc] hover:bg-[#2a6b4f]/50";

export const btnGhost =
  "inline-flex h-9 items-center border border-white/15 px-4 text-[11px] tracking-[0.12em] uppercase opacity-70 hover:opacity-100";

export const inputClass =
  "w-full border border-white/10 bg-[#141414] px-3 py-2 text-sm outline-none focus:border-white/25";
