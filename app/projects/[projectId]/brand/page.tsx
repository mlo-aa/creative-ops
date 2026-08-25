"use client";

import type { BrandColor, BrandLogo, LogoRole } from "@/core/types";
import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";

const ROLES: LogoRole[] = [
  "primary",
  "wordmark",
  "isotipo",
  "horizontal",
  "vertical",
  "light",
  "dark",
  "secondary",
];

export default function BrandPage() {
  const project = useProject();
  const { updateBrand } = useStudio();
  const brand = project.brand;

  function setBrand(next: typeof brand) {
    updateBrand(project.id, next);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl tracking-[-0.03em]">Brand setup</h1>
      <p className="mt-2 text-sm opacity-55">
        Palette, type and logos for this project. The editor only offers these approved values.
      </p>

      <section className="mt-10 grid gap-4">
        <Field label="Brand name">
          <input className={input} value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} />
        </Field>
        <Field label="Short name">
          <input className={input} value={brand.shortName} onChange={(e) => setBrand({ ...brand, shortName: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <input className={input} value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} />
        </Field>
        <Field label="Website">
          <input className={input} value={brand.website} onChange={(e) => setBrand({ ...brand, website: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea className={input} rows={3} value={brand.description} onChange={(e) => setBrand({ ...brand, description: e.target.value })} />
        </Field>
      </section>

      <h2 className="mt-12 text-xs tracking-[0.16em] uppercase opacity-50">Colors</h2>
      <div className="mt-4 space-y-3">
        {brand.colors.map((color, index) => (
          <div key={color.id} className="flex gap-3">
            <input
              type="color"
              value={color.hex}
              onChange={(e) => {
                const colors = brand.colors.map((item, i) => (i === index ? { ...item, hex: e.target.value } : item));
                setBrand({ ...brand, colors });
              }}
            />
            <input
              className={input}
              value={color.name}
              onChange={(e) => {
                const colors = brand.colors.map((item, i) => (i === index ? { ...item, name: e.target.value } : item));
                setBrand({ ...brand, colors });
              }}
            />
            <input className={input} value={color.hex} readOnly />
          </div>
        ))}
        <button
          type="button"
          className="text-[12px] uppercase tracking-[0.08em] opacity-60"
          onClick={() => {
            const color: BrandColor = {
              id: `color-${Date.now()}`,
              name: "New color",
              hex: "#888888",
            };
            setBrand({ ...brand, colors: [...brand.colors, color] });
          }}
        >
          + Add color
        </button>
      </div>

      <h2 className="mt-12 text-xs tracking-[0.16em] uppercase opacity-50">Typography</h2>
      <div className="mt-4 grid gap-3">
        {(["display", "body", "primary", "secondary"] as const).map((key) => (
          <Field key={key} label={key}>
            <input
              className={input}
              value={brand.fonts[key]}
              onChange={(e) => setBrand({ ...brand, fonts: { ...brand.fonts, [key]: e.target.value } })}
            />
          </Field>
        ))}
      </div>

      <h2 className="mt-12 text-xs tracking-[0.16em] uppercase opacity-50">Logos</h2>
      <div className="mt-4 space-y-4">
        {brand.logos.map((logo) => (
          <div key={logo.id} className="flex items-center gap-3 border border-white/10 p-3">
            <img src={logo.src} alt="" className="h-12 w-12 object-contain" />
            <input
              className={input}
              value={logo.name}
              onChange={(e) =>
                setBrand({
                  ...brand,
                  logos: brand.logos.map((item) => (item.id === logo.id ? { ...item, name: e.target.value } : item)),
                })
              }
            />
            <select
              className={input}
              value={logo.role}
              onChange={(e) =>
                setBrand({
                  ...brand,
                  logos: brand.logos.map((item) =>
                    item.id === logo.id ? { ...item, role: e.target.value as LogoRole } : item,
                  ),
                })
              }
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        ))}
        <label className="inline-block text-[12px] uppercase tracking-[0.08em] opacity-60">
          + Add logo
          <input
            type="file"
            accept="image/*,.svg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result !== "string") return;
                const logo: BrandLogo = {
                  id: `logo-${Date.now()}`,
                  name: file.name,
                  src: reader.result,
                  role: "secondary",
                };
                setBrand({ ...brand, logos: [...brand.logos, logo] });
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] tracking-[0.12em] uppercase opacity-50">{label}</span>
      {children}
    </label>
  );
}

const input = "w-full border border-white/15 bg-transparent px-3 py-2 text-sm";
