"use client";

import { contrastOk, hexOf } from "@/core/color";
import { templateControls } from "@/core/templates/registry";
import type { BrandProfile, DesignState } from "@/core/types";
import type { ChangeEvent } from "react";

export function DesignEditor({
  template,
  design,
  brand,
  onChange,
  onReset,
}: {
  template: string;
  design: DesignState;
  brand: BrandProfile;
  onChange: (patch: Partial<DesignState>) => void;
  onReset: () => void;
}) {
  const controls = templateControls(template);
  const logoRoles = ["isotipo", "wordmark"] as const;

  function onImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange({ imageSrc: reader.result });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <aside className="ig-export-ignore h-[calc(100vh-120px)] w-[300px] shrink-0 overflow-auto rounded-2xl border border-white/10 bg-[#1b1c1f] p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-white/55">Edit design</p>
        <button type="button" onClick={onReset} className="text-[12px] text-white/55 hover:text-white/85">
          Reset design
        </button>
      </div>
      {controls.copy.includes("eyebrow") ? (
        <Field label="Eyebrow">
          <input value={design.eyebrow} onChange={(e) => onChange({ eyebrow: e.target.value })} className={input} />
        </Field>
      ) : null}
      {controls.copy.includes("headline") ? (
        <Field label="Headline">
          <textarea value={design.headline} onChange={(e) => onChange({ headline: e.target.value })} rows={3} className={input} />
        </Field>
      ) : null}
      {controls.copy.includes("supporting") ? (
        <Field label="Supporting">
          <textarea value={design.supporting} onChange={(e) => onChange({ supporting: e.target.value })} rows={4} className={input} />
        </Field>
      ) : null}
      {controls.copy.includes("cta") ? (
        <Field label="CTA">
          <input value={design.cta} onChange={(e) => onChange({ cta: e.target.value })} className={input} />
        </Field>
      ) : null}
      {controls.copy.includes("labels") ? (
        <Field label="Labels">
          <textarea value={design.labels.join("\n")} onChange={(e) => onChange({ labels: e.target.value.split("\n") })} rows={6} className={input} />
        </Field>
      ) : null}
      <p className="mt-2 mb-3 text-[13px] text-white/55">Color</p>
      {controls.colors.map((field) => (
        <Field key={field} label={field}>
          <Swatches brand={brand} value={design[field]} onSelect={(id) => onChange({ [field]: id })} contrastAgainst={field === "text" ? design.background : undefined} />
        </Field>
      ))}
      {controls.logo ? (
        <>
          <Toggle label="Show logo" checked={design.showLogo} onChange={(showLogo) => onChange({ showLogo })} />
          <div className="mb-3 flex gap-2">
            {logoRoles.map((mode) => (
              <button key={mode} type="button" onClick={() => onChange({ logoMode: mode })} className={chip(design.logoMode === mode)}>
                {mode}
              </button>
            ))}
          </div>
          <Field label="Logo color">
            <Swatches brand={brand} value={design.logoColor} onSelect={(logoColor) => onChange({ logoColor })} />
          </Field>
          <div className="mb-4 grid grid-cols-2 gap-1">
            {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => (
              <button key={pos} type="button" onClick={() => onChange({ logoPosition: pos })} className={chip(design.logoPosition === pos)}>
                {pos.replace("-", " ")}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {controls.mark ? (
        <>
          <Toggle label="Show mark" checked={design.showMark} onChange={(showMark) => onChange({ showMark })} />
          <Slider label="Mark scale" value={design.markScale} min={0.4} max={1.8} step={0.05} onChange={(markScale) => onChange({ markScale })} />
        </>
      ) : null}
      <Slider label="Headline X" value={design.headlineX} min={-400} max={400} onChange={(headlineX) => onChange({ headlineX })} />
      <Slider label="Headline Y" value={design.headlineY} min={-400} max={400} onChange={(headlineY) => onChange({ headlineY })} />
      {controls.image ? (
        <>
          <p className="mt-2 mb-2 text-[13px] text-white/55">Image</p>
          <label className="mb-3 block text-[12px] text-white/55">
            Replace image
            <input type="file" accept="image/*" onChange={onImage} className="hidden" />
          </label>
          <Slider label="Position X" value={design.imageObjectX} min={0} max={100} onChange={(imageObjectX) => onChange({ imageObjectX })} />
          <Slider label="Position Y" value={design.imageObjectY} min={0} max={100} onChange={(imageObjectY) => onChange({ imageObjectY })} />
          <Slider label="Zoom" value={design.imageZoom} min={1} max={2.2} step={0.02} onChange={(imageZoom) => onChange({ imageZoom })} />
          <Slider label="Overlay" value={design.overlayIntensity} min={0} max={1} step={0.02} onChange={(overlayIntensity) => onChange({ overlayIntensity })} />
          <Field label="Overlay color">
            <Swatches brand={brand} value={design.overlayColor} onSelect={(overlayColor) => onChange({ overlayColor })} />
          </Field>
          <Toggle label="Grayscale" checked={design.imageGrayscale} onChange={(imageGrayscale) => onChange({ imageGrayscale })} />
        </>
      ) : null}
      {controls.path ? (
        <>
          <p className="mt-2 mb-2 text-[13px] text-white/55">Graphic</p>
          <Toggle label="Show path" checked={design.pathVisible} onChange={(pathVisible) => onChange({ pathVisible })} />
          <Slider label="Scale" value={design.pathScale} min={0.6} max={1.6} step={0.02} onChange={(pathScale) => onChange({ pathScale })} />
          <Slider label="X" value={design.pathX} min={-240} max={240} onChange={(pathX) => onChange({ pathX })} />
          <Slider label="Y" value={design.pathY} min={-240} max={240} onChange={(pathY) => onChange({ pathY })} />
          <Slider label="Stroke" value={design.pathWidth} min={0.8} max={4} step={0.1} onChange={(pathWidth) => onChange({ pathWidth })} />
          <Field label="Stroke color">
            <Swatches brand={brand} value={design.pathColor} onSelect={(pathColor) => onChange({ pathColor })} />
          </Field>
        </>
      ) : null}
      {controls.texture ? (
        <>
          <p className="mt-2 mb-2 text-[13px] text-white/55">Texture</p>
          <Toggle
            label="Show texture"
            checked={design.textureVisible}
            onChange={(textureVisible) => onChange({ textureVisible })}
          />
          <Slider
            label="Scale"
            value={design.textureScale}
            min={0.4}
            max={2.4}
            step={0.02}
            onChange={(textureScale) => onChange({ textureScale })}
          />
          <Slider label="X" value={design.textureX} min={-600} max={600} onChange={(textureX) => onChange({ textureX })} />
          <Slider label="Y" value={design.textureY} min={-600} max={600} onChange={(textureY) => onChange({ textureY })} />
          <Slider
            label="Opacity"
            value={design.textureOpacity}
            min={0}
            max={1}
            step={0.02}
            onChange={(textureOpacity) => onChange({ textureOpacity })}
          />
          <Slider
            label="Rotation"
            value={design.textureRotation}
            min={-180}
            max={180}
            step={1}
            onChange={(textureRotation) => onChange({ textureRotation })}
          />
          <Slider
            label="Blur"
            value={design.textureBlur}
            min={0}
            max={40}
            step={1}
            onChange={(textureBlur) => onChange({ textureBlur })}
          />
        </>
      ) : null}
      {controls.animation ? (
        <>
          <Toggle label="Animation" checked={design.animationEnabled} onChange={(animationEnabled) => onChange({ animationEnabled })} />
          <Slider label="Speed" value={design.animationSpeed} min={0.4} max={2.2} step={0.1} onChange={(animationSpeed) => onChange({ animationSpeed })} />
        </>
      ) : null}
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-[12px] text-white/45">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="mb-3 flex w-full justify-between text-[12px]">
      <span>{label}</span>
      <span className={checked ? "opacity-100" : "opacity-40"}>{checked ? "On" : "Off"}</span>
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 flex justify-between text-[12px] text-white/45">
        <span>{label}</span>
        <span>{Number(value).toFixed(step < 1 ? 2 : 0)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

function Swatches({
  brand,
  value,
  onSelect,
  contrastAgainst,
}: {
  brand: BrandProfile;
  value: string;
  onSelect: (id: string) => void;
  contrastAgainst?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {brand.colors.map((color) => {
        const disabled = contrastAgainst
          ? !contrastOk(hexOf(brand, contrastAgainst), color.hex)
          : false;
        return (
          <button
            key={color.id}
            type="button"
            title={color.name}
            disabled={disabled}
            onClick={() => onSelect(color.id)}
            className="h-[22px] w-[22px] rounded-full"
            style={{
              background: color.hex,
              border: value === color.id ? "2px solid #f2f1ed" : "1px solid #ffffff33",
              opacity: disabled ? 0.25 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

const input =
  "w-full rounded-lg border border-white/15 bg-transparent px-2.5 py-2 text-[13px] text-[#f2f1ed]";

function chip(active: boolean) {
  return `rounded-lg border px-2.5 py-1.5 text-[12px] ${active ? "border-white/80" : "border-white/15"}`;
}
