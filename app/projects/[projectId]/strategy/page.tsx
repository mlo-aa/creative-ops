"use client";

import { useStudio } from "@/core/store";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { AutosaveField, SectionHeader } from "@/core/ui/OpsField";

const FIELDS = [
  { key: "projectObjective", label: "Project objective" },
  { key: "businessObjective", label: "Business objective" },
  { key: "communicationObjective", label: "Communication objective" },
  { key: "audience", label: "Audience" },
  { key: "targetAudience", label: "Target audience" },
  { key: "userProblem", label: "User problem" },
  { key: "valueProposition", label: "Value proposition" },
  { key: "positioning", label: "Positioning" },
  { key: "keyMessages", label: "Key messages" },
  { key: "proofPoints", label: "Proof points" },
  { key: "channels", label: "Channels" },
  { key: "kpis", label: "KPIs" },
  { key: "competitors", label: "Competitors" },
  { key: "constraints", label: "Constraints" },
  { key: "risks", label: "Risks" },
  { key: "campaignTimeline", label: "Timeline" },
  { key: "successCriteria", label: "Success criteria" },
  { key: "problem", label: "Problem" },
  { key: "objective", label: "Objective (legacy)" },
  { key: "notes", label: "Notes" },
] as const;

export default function ProjectStrategyPage() {
  const params = useParams<{ projectId: string }>();
  const { getStrategy, updateStrategy } = useStudio();
  const strategy = getStrategy(params.projectId);

  const save = useCallback(
    (key: (typeof FIELDS)[number]["key"], value: string) => {
      updateStrategy(params.projectId, { [key]: value });
    },
    [params.projectId, updateStrategy],
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <SectionHeader title="Strategy" />
      <p className="-mt-4 mb-8 text-sm opacity-50">Project strategy document — autosaved. All fields optional.</p>
      <div className="space-y-8">
        {FIELDS.map((field) => (
          <AutosaveField
            key={field.key}
            label={field.label}
            value={strategy[field.key]}
            onSave={(v) => save(field.key, v)}
            rows={field.key === "notes" ? 6 : 4}
          />
        ))}
      </div>
    </main>
  );
}
