"use client";

import { BrandSetupPanel } from "@/core/project/BrandSetupPanel";
import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import Link from "next/link";
import { AutosaveField, SectionHeader } from "@/core/ui/OpsField";
import { useCallback } from "react";

export default function ProjectBrandingPage() {
  const project = useProject();
  const { getBrandExtension, updateBrandExtension } = useStudio();
  const ext = getBrandExtension(project.id);

  const save = useCallback(
    (patch: Parameters<typeof updateBrandExtension>[1]) => updateBrandExtension(project.id, patch),
    [project.id, updateBrandExtension],
  );

  return (
    <div>
      <main className="border-b border-white/10 px-6 py-6">
        <SectionHeader
          title="Brand extensions"
          action={
            <Link
              href={`/projects/${project.id}/assets`}
              className="text-[11px] tracking-[0.12em] uppercase opacity-50"
            >
              Asset library →
            </Link>
          }
        />
        <div className="mx-auto max-w-3xl space-y-8">
          <AutosaveField label="Voice & tone" value={ext.voiceTone} onSave={(v) => save({ voiceTone: v })} rows={4} />
          <AutosaveField
            label="Typography notes"
            value={ext.typographyNotes}
            onSave={(v) => save({ typographyNotes: v })}
            rows={3}
          />
          <label className="block">
            <span className="mb-1.5 block text-[11px] tracking-[0.14em] uppercase opacity-45">
              Keywords (comma-separated)
            </span>
            <input
              className="w-full border border-white/10 bg-[#15171a] px-3 py-2 text-sm"
              value={ext.keywords.join(", ")}
              onChange={(e) =>
                save({ keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })
              }
            />
          </label>
        </div>
      </main>
      <BrandSetupPanel />
    </div>
  );
}
