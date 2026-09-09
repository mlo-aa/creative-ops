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
      <span className="mb-2 block text-[13px] text-white/45">{label}</span>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={inputClass}
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
      <span className="mb-2 block text-[13px] text-white/45">{label}</span>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

export function StatusPill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{
        background: color ? `${color}1f` : "rgba(242,241,237,0.08)",
        color: color ?? "rgba(242,241,237,0.7)",
      }}
    >
      {children}
    </span>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h1 className="text-2xl tracking-[-0.02em] font-semibold text-[#f2f1ed]">{title}</h1>
      {action}
    </div>
  );
}

export const btnPrimary =
  "inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#f2f1ed] px-4 text-[13px] font-medium text-[#0c0d0f] transition hover:opacity-90";

export const btnGhost =
  "inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 px-4 text-[13px] text-white/75 transition hover:border-white/30 hover:text-white";

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#15171a] px-3.5 py-2.5 text-sm text-[#f2f1ed] outline-none transition focus:border-white/25";
