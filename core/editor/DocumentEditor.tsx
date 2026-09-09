"use client";

import type { BrandProfile } from "@/core/types";
import type { DesignDocument, DesignElement, TextPrimitiveProps } from "@/core/design/document";
import { inputClass } from "@/core/ui/OpsField";
import { hexOf } from "@/core/color";

export function DocumentEditor({
  document,
  brand,
  selectedId,
  onSelect,
  onChange,
}: {
  document: DesignDocument;
  brand: BrandProfile;
  selectedId?: string;
  onSelect: (id: string) => void;
  onChange: (next: DesignDocument) => void;
}) {
  const selected = document.elements.find((e) => e.id === selectedId);

  function patchElement(id: string, patch: Partial<DesignElement>) {
    onChange({
      ...document,
      elements: document.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    });
  }

  function patchText(id: string, patch: Partial<TextPrimitiveProps>) {
    onChange({
      ...document,
      elements: document.elements.map((el) =>
        el.id === id ? { ...el, props: { ...el.props, ...patch } } : el,
      ),
    });
  }

  return (
    <aside className="w-[320px] shrink-0 rounded-2xl border border-white/10 bg-[#15171a] p-4">
      <h2 className="text-[13px] text-white/55">Document layers</h2>
      <ul className="mt-3 max-h-48 space-y-1 overflow-auto">
        {[...document.elements].reverse().map((el) => (
          <li key={el.id}>
            <button
              type="button"
              onClick={() => onSelect(el.id)}
              className="w-full px-2 py-1.5 text-left text-xs"
              style={{
                background: selectedId === el.id ? "rgba(255,255,255,0.08)" : "transparent",
                opacity: el.visible ? 1 : 0.35,
              }}
            >
              {el.name || el.type} <span className="opacity-40">· {el.type}</span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <div className="mt-6 space-y-4 border-t border-white/10 pt-4">
          <Field label="Name">
            <input className={inputClass} value={selected.name} onChange={(e) => patchElement(selected.id, { name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="X">
              <input type="number" className={inputClass} value={selected.x} onChange={(e) => patchElement(selected.id, { x: Number(e.target.value) })} />
            </Field>
            <Field label="Y">
              <input type="number" className={inputClass} value={selected.y} onChange={(e) => patchElement(selected.id, { y: Number(e.target.value) })} />
            </Field>
            <Field label="W">
              <input type="number" className={inputClass} value={selected.width} onChange={(e) => patchElement(selected.id, { width: Number(e.target.value) })} />
            </Field>
            <Field label="H">
              <input type="number" className={inputClass} value={selected.height} onChange={(e) => patchElement(selected.id, { height: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Opacity">
            <input type="range" min={0} max={1} step={0.05} value={selected.opacity} onChange={(e) => patchElement(selected.id, { opacity: Number(e.target.value) })} />
          </Field>

          {selected.type === "text" ? (
            <>
              <Field label="Content">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={(selected.props as TextPrimitiveProps).content}
                  onChange={(e) => patchText(selected.id, { content: e.target.value })}
                />
              </Field>
              <Field label="Font size">
                <input
                  type="number"
                  className={inputClass}
                  value={(selected.props as TextPrimitiveProps).fontSize}
                  onChange={(e) => patchText(selected.id, { fontSize: Number(e.target.value) })}
                />
              </Field>
              <Field label="Color">
                <select
                  className={inputClass}
                  value={(selected.props as TextPrimitiveProps).colorId}
                  onChange={(e) => patchText(selected.id, { colorId: e.target.value })}
                >
                  {brand.colors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </>
          ) : null}

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={selected.visible} onChange={(e) => patchElement(selected.id, { visible: e.target.checked })} />
            Visible
          </label>
        </div>
      ) : (
        <p className="mt-6 text-xs opacity-40">Select a layer to edit properties.</p>
      )}

      <div className="mt-6 border-t border-white/10 pt-4">
        <Field label="Canvas background">
          <select
            className={inputClass}
            value={document.canvas.backgroundColorId}
            onChange={(e) =>
              onChange({ ...document, canvas: { ...document.canvas, backgroundColorId: e.target.value } })
            }
          >
            {brand.colors.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.hex})</option>
            ))}
          </select>
        </Field>
        {document.metadata.generatedBy === "ai" ? (
          <p className="mt-3 text-[10px] opacity-35">Generated design · mock provider</p>
        ) : null}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-white/45">{label}</span>
      {children}
    </label>
  );
}
