"use client";

import { FORMAT_PRESETS } from "@/core/formats";
import {
  CHANNEL_OPTIONS,
  DELIVERABLE_OPTIONS,
  INTAKE_STEPS,
  type SourceCategory,
  type SourceType,
} from "@/core/ops/intake";
import type { OpsProject, ProjectType } from "@/core/ops/types";
import { useStudio } from "@/core/store";
import { AutosaveField, btnGhost, btnPrimary, inputClass } from "@/core/ui/OpsField";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PROJECT_TYPES: ProjectType[] = [
  "branding", "social", "campaign", "website", "landing_page", "product",
  "strategy", "content", "launch", "pitch_deck", "internal", "other",
];

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "website", label: "Website URL" },
  { value: "landing_page", label: "Landing page URL" },
  { value: "social_profile", label: "Social profile URL" },
  { value: "figma", label: "Figma URL" },
  { value: "github", label: "GitHub repository" },
  { value: "notion", label: "Notion URL" },
  { value: "google_drive", label: "Google Drive / Docs" },
  { value: "other_url", label: "Other URL" },
  { value: "notes", label: "Plain text / notes" },
];

const SOURCE_CATEGORIES: SourceCategory[] = [
  "brandbook", "landing_page", "website", "product", "strategy", "research",
  "pitch_deck", "content_plan", "campaign", "competitor", "inspiration",
  "technical", "customer_research", "interview", "legal", "previous_version", "other",
];

type BasicsForm = {
  name: string;
  clientName: string;
  clientId: string;
  code: string;
  types: ProjectType[];
  status: OpsProject["status"];
  startDate: string;
  deadline: string;
  owner: string;
  color: string;
  description: string;
  formatId: string;
};

export function IntakeWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    ops,
    createOpsProject,
    updateOpsProject,
    updateIntake,
    updateStrategy,
    updateKnowledge,
    addSource,
    addReference,
    addReferenceBoard,
    addDecision,
    addCompetitor,
    getIntake,
    previewProjectCode,
    getKnowledge,
    addDeliverable,
  } = useStudio();

  const existingId = searchParams.get("projectId") ?? "";
  const [projectId, setProjectId] = useState(existingId);
  const [step, setStep] = useState(0);

  const [basics, setBasics] = useState<BasicsForm>(() => ({
    name: "",
    clientName: "",
    clientId: "",
    code: "",
    types: ["social"],
    status: "draft",
    startDate: "",
    deadline: "",
    owner: "",
    color: "#149A9B",
    description: "",
    formatId: "instagram-portrait",
  }));

  const intake = projectId ? getIntake(projectId) : null;

  useEffect(() => {
    if (!existingId) {
      setBasics((b) => ({ ...b, code: previewProjectCode() }));
    }
  }, [existingId, previewProjectCode]);

  useEffect(() => {
    if (existingId && intake) {
      setStep(intake.intakeStep ?? 0);
      const op = ops.projects.find((p) => p.id === existingId);
      if (op) {
        setBasics({
          name: op.name,
          clientName: op.clientName,
          clientId: op.clientId ?? "",
          code: op.code,
          types: op.types ?? [op.type],
          status: op.status,
          startDate: op.startDate ?? "",
          deadline: op.deadline ?? "",
          owner: op.owner ?? "",
          color: op.color,
          description: op.description ?? "",
          formatId: "instagram-portrait",
        });
      }
    }
  }, [existingId, intake, ops.projects]);

  const saveStep = useCallback(
    (nextStep: number) => {
      if (projectId) {
        updateIntake(projectId, { intakeStep: nextStep });
        updateOpsProject(projectId, { intakeStep: nextStep });
      }
      setStep(nextStep);
    },
    [projectId, updateIntake, updateOpsProject],
  );

  function ensureProject(): string {
    if (projectId) {
      updateOpsProject(projectId, {
        name: basics.name,
        clientName: basics.clientName,
        clientId: basics.clientId || undefined,
        code: basics.code,
        type: basics.types[0] ?? "other",
        types: basics.types,
        status: basics.status,
        startDate: basics.startDate || undefined,
        deadline: basics.deadline || undefined,
        owner: basics.owner || undefined,
        color: basics.color,
        description: basics.description,
      });
      return projectId;
    }
    const id = createOpsProject({
      name: basics.name || "Untitled",
      clientName: basics.clientName || basics.name,
      clientId: basics.clientId || undefined,
      code: basics.code,
      type: basics.types[0] ?? "other",
      types: basics.types,
      status: basics.status,
      startDate: basics.startDate || undefined,
      deadline: basics.deadline || undefined,
      owner: basics.owner || undefined,
      color: basics.color,
      description: basics.description,
      formatId: basics.formatId,
      intakeDraft: true,
    });
    setProjectId(id);
    return id;
  }

  function toggleType(type: ProjectType) {
    setBasics((b) => ({
      ...b,
      types: b.types.includes(type) ? b.types.filter((t) => t !== type) : [...b.types, type],
    }));
  }

  return (
    <div className="mx-auto max-w-3xl py-4">
      <Link href="/projects/new" className="text-xs tracking-[0.14em] uppercase opacity-50">
        ← New project
      </Link>
      <h1 className="mt-6 text-3xl tracking-[-0.04em]" style={{ fontWeight: 500 }}>
        Project intake
      </h1>
      <p className="mt-2 text-sm opacity-50">
        Build the shared brain for this project. Save as draft at any step.
      </p>

      <nav className="mt-8 flex flex-wrap gap-1 border-b border-white/10 pb-4">
        {INTAKE_STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => (projectId || i === 0 ? saveStep(i) : null)}
            className="px-2 py-1 text-[10px] tracking-[0.12em] uppercase"
            style={{ opacity: step === i ? 1 : 0.35 }}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      <div className="mt-8 space-y-6">
        {step === 0 && (
          <>
            <Field label="Project name">
              <input className={inputClass} value={basics.name} onChange={(e) => setBasics({ ...basics, name: e.target.value })} />
            </Field>
            <Field label="Client / Brand">
              <input className={inputClass} value={basics.clientName} onChange={(e) => setBasics({ ...basics, clientName: e.target.value })} />
              {ops.clients.length ? (
                <select
                  className={`${inputClass} mt-2`}
                  value={basics.clientId}
                  onChange={(e) => {
                    const c = ops.clients.find((x) => x.id === e.target.value);
                    setBasics({ ...basics, clientId: e.target.value, clientName: c?.name ?? basics.clientName });
                  }}
                >
                  <option value="">Link existing client…</option>
                  {ops.clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : null}
            </Field>
            <Field label="Project code">
              <input className={inputClass} value={basics.code} onChange={(e) => setBasics({ ...basics, code: e.target.value })} />
            </Field>
            <Field label="Project type (multiple)">
              <div className="flex flex-wrap gap-2">
                {PROJECT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className="border px-2 py-1 text-[10px] uppercase"
                    style={{
                      borderColor: basics.types.includes(t) ? basics.color : "rgba(255,255,255,0.15)",
                      opacity: basics.types.includes(t) ? 1 : 0.45,
                    }}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select className={inputClass} value={basics.status} onChange={(e) => setBasics({ ...basics, status: e.target.value as OpsProject["status"] })}>
                  {(["draft", "active", "on_hold", "completed", "archived"] as const).map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </Field>
              <Field label="Project owner">
                <input className={inputClass} value={basics.owner} onChange={(e) => setBasics({ ...basics, owner: e.target.value })} />
              </Field>
              <Field label="Start date">
                <input type="date" className={inputClass} value={basics.startDate} onChange={(e) => setBasics({ ...basics, startDate: e.target.value })} />
              </Field>
              <Field label="Deadline">
                <input type="date" className={inputClass} value={basics.deadline} onChange={(e) => setBasics({ ...basics, deadline: e.target.value })} />
              </Field>
            </div>
            <Field label="Project color (Studio organization)">
              <input type="color" value={basics.color} onChange={(e) => setBasics({ ...basics, color: e.target.value })} />
            </Field>
            <Field label="Short description">
              <textarea className={inputClass} rows={3} value={basics.description} onChange={(e) => setBasics({ ...basics, description: e.target.value })} />
            </Field>
            <Field label="Default format">
              <select className={inputClass} value={basics.formatId} onChange={(e) => setBasics({ ...basics, formatId: e.target.value })}>
                {FORMAT_PRESETS.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        {step === 1 && projectId && intake && (
          <>
            <AutosaveField label="What is the brand / product?" value={intake.brandProduct.whatIsIt} onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, whatIsIt: v } })} rows={5} />
            <AutosaveField label="What problem does it solve?" value={intake.brandProduct.problemSolved} onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, problemSolved: v } })} rows={4} />
            <AutosaveField label="Who is it for?" value={intake.brandProduct.whoIsItFor} onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, whoIsItFor: v } })} rows={3} />
            <AutosaveField
              label="Primary users (comma-separated)"
              value={intake.brandProduct.primaryUsers.join(", ")}
              onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, primaryUsers: v.split(",").map((s) => s.trim()).filter(Boolean) } })}
              rows={2}
            />
            <Field label="Current stage">
              <select
                className={inputClass}
                value={intake.brandProduct.currentStage}
                onChange={(e) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, currentStage: e.target.value } })}
              >
                {["idea", "pre_seed", "mvp", "beta", "live", "growth", "established", "custom"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <AutosaveField label="Current positioning" value={intake.brandProduct.currentPositioning} onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, currentPositioning: v } })} rows={3} />
            <AutosaveField label="Current slogan / tagline" value={intake.brandProduct.currentSlogan} onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, currentSlogan: v } })} rows={2} />
            <AutosaveField label="Previous brand / previous name" value={intake.brandProduct.previousBrand} onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, previousBrand: v } })} rows={2} />
            <AutosaveField
              label="Technology / infrastructure (comma-separated)"
              value={intake.brandProduct.technology.join(", ")}
              onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, technology: v.split(",").map((s) => s.trim()).filter(Boolean) } })}
              rows={2}
            />
            <AutosaveField
              label="Key differentiators (one per line)"
              value={intake.brandProduct.differentiators.join("\n")}
              onSave={(v) => updateIntake(projectId, { brandProduct: { ...intake.brandProduct, differentiators: v.split("\n").map((s) => s.trim()).filter(Boolean) } })}
              rows={4}
            />
          </>
        )}

        {step === 2 && projectId && (
          <SourcesStep projectId={projectId} addSource={addSource} sources={ops.sources.filter((s) => s.projectId === projectId)} />
        )}

        {step === 3 && projectId && (
          <ReferencesStep
            projectId={projectId}
            addReference={addReference}
            addReferenceBoard={addReferenceBoard}
            references={ops.references.filter((r) => r.projectId === projectId)}
            boards={ops.referenceBoards.filter((b) => b.projectId === projectId)}
          />
        )}

        {step === 4 && projectId && (
          <StrategyStep projectId={projectId} updateStrategy={updateStrategy} getStrategy={() => ops.strategies[projectId] ?? { projectId, updatedAt: "" }} />
        )}

        {step === 5 && projectId && intake && (
          <CreativeDirectionStep
            projectId={projectId}
            intake={intake}
            updateIntake={updateIntake}
            updateKnowledge={updateKnowledge}
            knowledge={getKnowledge(projectId)}
          />
        )}

        {step === 6 && projectId && intake && (
          <ChannelsStep projectId={projectId} intake={intake} updateIntake={updateIntake} addCompetitor={addCompetitor} competitors={ops.competitors.filter((c) => c.projectId === projectId)} />
        )}

        {step === 7 && projectId && (
          <ReviewStep projectId={projectId} basics={basics} intake={intake} sources={ops.sources.filter((s) => s.projectId === projectId)} references={ops.references.filter((r) => r.projectId === projectId)} />
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        {step > 0 ? (
          <button type="button" className={btnGhost} onClick={() => saveStep(step - 1)}>Back</button>
        ) : null}
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            const id = ensureProject();
            updateIntake(id, { intakeDraft: true, intakeStep: step });
            router.push(`/projects/${id}/overview`);
          }}
        >
          Save as draft
        </button>
        {step < INTAKE_STEPS.length - 1 ? (
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              if (step === 0) ensureProject();
              saveStep(step + 1);
            }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              if (!projectId || !intake) return;
              const deliverableTypeMap: Record<string, import("@/core/ops/types").DeliverableType> = {
                Logo: "logo",
                Brandbook: "brandbook",
                "Landing page": "landing",
                "Instagram feed": "post",
                "Social campaign": "campaign",
                "Pitch deck": "presentation",
                Video: "video",
                Reel: "video",
                GIF: "gif",
                Carousel: "carousel",
                Report: "report",
                Documentation: "document",
                "Product UI": "other",
                Website: "website",
                Motion: "video",
                Other: "other",
              };
              for (const name of intake.expectedDeliverables) {
                addDeliverable({
                  projectId,
                  name,
                  type: deliverableTypeMap[name] ?? "other",
                  status: "pending",
                  notes: "Seeded from project intake",
                });
              }
              updateIntake(projectId, { intakeDraft: false, intakeStep: 7 });
              updateOpsProject(projectId, {
                intakeCompleted: true,
                status: basics.status === "draft" ? "active" : basics.status,
                intakeStep: 7,
              });
              router.push(`/projects/${projectId}/overview`);
            }}
          >
            Create project
          </button>
        )}
      </div>
    </div>
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

function SourcesStep({
  projectId,
  addSource,
  sources,
}: {
  projectId: string;
  addSource: ReturnType<typeof useStudio>["addSource"];
  sources: import("@/core/ops/intake").ProjectSource[];
}) {
  const [form, setForm] = useState({
    title: "",
    sourceType: "website" as SourceType,
    category: "other" as SourceCategory,
    url: "",
    content: "",
    description: "",
    tags: "",
    priority: "reference" as const,
    isSourceOfTruth: false,
  });

  return (
    <>
      <p className="text-sm opacity-50">Add websites, files, docs, and notes. Sources are important project context — richer than links.</p>
      <form
        className="grid gap-3 border border-white/10 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          addSource({
            projectId,
            title: form.title,
            sourceType: form.sourceType,
            category: form.category,
            url: form.url,
            fileData: "",
            fileName: "",
            fileMime: "",
            content: form.content,
            description: form.description,
            tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
            priority: form.priority,
            status: "current",
            isSourceOfTruth: form.isSourceOfTruth,
            supersededBy: "",
            extractedText: form.content.slice(0, 2000),
            notes: "",
            relatedDecisionIds: [],
            relatedContentIds: [],
            relatedDeliverableIds: [],
          });
          setForm({ ...form, title: "", url: "", content: "", description: "", tags: "" });
        }}
      >
        <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <select className={inputClass} value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as SourceType })}>
          {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SourceCategory })}>
          {SOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
        {form.sourceType === "notes" ? (
          <textarea className={`${inputClass} sm:col-span-2`} placeholder="Paste notes" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        ) : (
          <input className={`${inputClass} sm:col-span-2`} placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        )}
        <textarea className={`${inputClass} sm:col-span-2`} placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="flex items-center gap-2 text-xs opacity-70 sm:col-span-2">
          <input type="checkbox" checked={form.isSourceOfTruth} onChange={(e) => setForm({ ...form, isSourceOfTruth: e.target.checked })} />
          Mark as source of truth
        </label>
        <button type="submit" className={`${btnPrimary} sm:col-span-2`}>Add source</button>
      </form>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li key={s.id} className="border border-white/10 px-4 py-3 text-sm">
            <span className="font-medium">{s.title}</span>
            <span className="ml-2 text-[10px] uppercase opacity-40">{s.category}</span>
            {s.isSourceOfTruth ? <span className="ml-2 text-[10px] text-[#7ecba8]">SOT</span> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function ReferencesStep({
  projectId,
  addReference,
  addReferenceBoard,
  references,
  boards,
}: {
  projectId: string;
  addReference: ReturnType<typeof useStudio>["addReference"];
  addReferenceBoard: ReturnType<typeof useStudio>["addReferenceBoard"];
  references: import("@/core/ops/intake").ProjectReference[];
  boards: import("@/core/ops/intake").ReferenceBoard[];
}) {
  const [form, setForm] = useState({
    title: "",
    url: "",
    whatWeLike: "",
    whatNotToCopy: "",
    category: "visual" as const,
    boardId: "",
  });
  const [boardName, setBoardName] = useState("");

  return (
    <>
      <p className="text-sm opacity-50">References preserve why something matters — not just URLs.</p>
      <div className="flex gap-2">
        <input className={inputClass} placeholder="New board name" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
        <button type="button" className={btnGhost} onClick={() => { if (boardName) { addReferenceBoard({ projectId, name: boardName, description: "" }); setBoardName(""); } }}>Add board</button>
      </div>
      {boards.length ? (
        <div className="flex flex-wrap gap-2">
          {boards.map((b) => (
            <span key={b.id} className="border border-white/10 px-2 py-1 text-[10px] uppercase">{b.name}</span>
          ))}
        </div>
      ) : null}
      <form
        className="grid gap-3 border border-white/10 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          addReference({
            projectId,
            boardId: form.boardId,
            title: form.title,
            url: form.url,
            imageSrc: "",
            category: form.category,
            whatWeLike: form.whatWeLike,
            whatNotToCopy: form.whatNotToCopy,
            tags: [],
            notes: "",
          });
          setForm({ title: "", url: "", whatWeLike: "", whatNotToCopy: "", category: "visual", boardId: "" });
        }}
      >
        <input className={inputClass} placeholder="Title (e.g. GrantFox Instagram)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={inputClass} placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <select className={inputClass} value={form.boardId} onChange={(e) => setForm({ ...form, boardId: e.target.value })}>
          <option value="">No board</option>
          {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <textarea className={inputClass} placeholder="What we like" rows={3} value={form.whatWeLike} onChange={(e) => setForm({ ...form, whatWeLike: e.target.value })} />
        <textarea className={inputClass} placeholder="Do NOT copy" rows={3} value={form.whatNotToCopy} onChange={(e) => setForm({ ...form, whatNotToCopy: e.target.value })} />
        <button type="submit" className={btnPrimary}>Add reference</button>
      </form>
      <ul className="space-y-3">
        {references.map((r) => (
          <li key={r.id} className="border border-white/10 p-4">
            <p className="font-medium">{r.title}</p>
            {r.whatWeLike ? <p className="mt-2 text-xs opacity-60"><strong>Like:</strong> {r.whatWeLike}</p> : null}
            {r.whatNotToCopy ? <p className="mt-1 text-xs opacity-60"><strong>Avoid:</strong> {r.whatNotToCopy}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function StrategyStep({
  projectId,
  updateStrategy,
  getStrategy,
}: {
  projectId: string;
  updateStrategy: ReturnType<typeof useStudio>["updateStrategy"];
  getStrategy: () => import("@/core/ops/types").ProjectStrategy | { projectId: string; updatedAt: string };
}) {
  const strategy = getStrategy();
  const fields = [
    ["projectObjective", "Project objective"],
    ["businessObjective", "Business objective"],
    ["communicationObjective", "Communication objective"],
    ["audience", "Audience"],
    ["userProblem", "User problem"],
    ["valueProposition", "Value proposition"],
    ["positioning", "Positioning"],
    ["keyMessages", "Key messages"],
    ["proofPoints", "Proof points"],
    ["channels", "Channels"],
    ["kpis", "KPIs"],
    ["competitors", "Competitors"],
    ["constraints", "Constraints"],
    ["risks", "Risks"],
    ["campaignTimeline", "Timeline"],
    ["successCriteria", "Success criteria"],
  ] as const;

  return (
    <div className="space-y-6">
      {fields.map(([key, label]) => (
        <AutosaveField
          key={key}
          label={label}
          value={(strategy as Record<string, string>)[key] ?? ""}
          onSave={(v) => updateStrategy(projectId, { [key]: v })}
          rows={3}
        />
      ))}
    </div>
  );
}

function CreativeDirectionStep({
  projectId,
  intake,
  updateIntake,
  updateKnowledge,
  knowledge,
}: {
  projectId: string;
  intake: import("@/core/ops/intake").ProjectIntake;
  updateIntake: ReturnType<typeof useStudio>["updateIntake"];
  updateKnowledge: ReturnType<typeof useStudio>["updateKnowledge"];
  knowledge: import("@/core/ops/intake").KnowledgeNotes;
}) {
  const cd = intake.creativeDirection;
  return (
    <div className="space-y-6">
      <AutosaveField
        label="Brand personality (comma-separated tags)"
        value={cd.brandPersonality.join(", ")}
        onSave={(v) => updateIntake(projectId, { creativeDirection: { ...cd, brandPersonality: v.split(",").map((s) => s.trim()).filter(Boolean) } })}
        rows={2}
      />
      <AutosaveField label="Desired feeling" value={cd.desiredFeeling} onSave={(v) => updateIntake(projectId, { creativeDirection: { ...cd, desiredFeeling: v } })} rows={3} />
      <AutosaveField label="Visual direction" value={cd.visualDirection} onSave={(v) => updateIntake(projectId, { creativeDirection: { ...cd, visualDirection: v } })} rows={4} />
      <AutosaveField label="Voice and tone" value={cd.voiceAndTone} onSave={(v) => updateIntake(projectId, { creativeDirection: { ...cd, voiceAndTone: v } })} rows={3} />
      <AutosaveField label="Words to use" value={cd.wordsToUse} onSave={(v) => updateIntake(projectId, { creativeDirection: { ...cd, wordsToUse: v } })} rows={2} />
      <AutosaveField label="Words to avoid" value={cd.wordsToAvoid} onSave={(v) => updateIntake(projectId, { creativeDirection: { ...cd, wordsToAvoid: v } })} rows={2} />
      <AutosaveField label="Typography direction" value={cd.typographyDirection} onSave={(v) => updateIntake(projectId, { creativeDirection: { ...cd, typographyDirection: v } })} rows={2} />
      <AutosaveField label="Color direction" value={cd.colorDirection} onSave={(v) => updateIntake(projectId, { creativeDirection: { ...cd, colorDirection: v } })} rows={2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Logo status">
          <select className={inputClass} value={cd.logoStatus} onChange={(e) => updateIntake(projectId, { creativeDirection: { ...cd, logoStatus: e.target.value as typeof cd.logoStatus } })}>
            {["existing", "being_refined", "pending", "not_needed"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Slogan status">
          <select className={inputClass} value={cd.sloganStatus} onChange={(e) => updateIntake(projectId, { creativeDirection: { ...cd, sloganStatus: e.target.value as typeof cd.sloganStatus } })}>
            {["existing", "exploring", "pending", "not_needed"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <AutosaveField label="Avoid / Do not use (critical restrictions)" value={knowledge.avoidDoNotUse} onSave={(v) => updateKnowledge(projectId, { avoidDoNotUse: v })} rows={4} />
      <AutosaveField label="Terminology (preferred language)" value={knowledge.terminology} onSave={(v) => updateKnowledge(projectId, { terminology: v })} rows={3} />
    </div>
  );
}

function ChannelsStep({
  projectId,
  intake,
  updateIntake,
  addCompetitor,
  competitors,
}: {
  projectId: string;
  intake: import("@/core/ops/intake").ProjectIntake;
  updateIntake: ReturnType<typeof useStudio>["updateIntake"];
  addCompetitor: ReturnType<typeof useStudio>["addCompetitor"];
  competitors: import("@/core/ops/intake").CompetitorBenchmark[];
}) {
  function toggleChannel(ch: string) {
    const channels = intake.channels.includes(ch)
      ? intake.channels.filter((c) => c !== ch)
      : [...intake.channels, ch];
    updateIntake(projectId, { channels });
  }

  function toggleDeliverable(d: string) {
    const expectedDeliverables = intake.expectedDeliverables.includes(d)
      ? intake.expectedDeliverables.filter((x) => x !== d)
      : [...intake.expectedDeliverables, d];
    updateIntake(projectId, { expectedDeliverables });
  }

  const [cmp, setCmp] = useState({ name: "", website: "", whyRelevant: "" });

  return (
    <>
      <Field label="Channels">
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map((ch) => (
            <button key={ch} type="button" onClick={() => toggleChannel(ch)} className="border px-2 py-1 text-[10px] uppercase" style={{ opacity: intake.channels.includes(ch) ? 1 : 0.4 }}>{ch}</button>
          ))}
        </div>
      </Field>
      <Field label="Expected deliverables (seeds Deliverables tab)">
        <div className="flex flex-wrap gap-2">
          {DELIVERABLE_OPTIONS.map((d) => (
            <button key={d} type="button" onClick={() => toggleDeliverable(d)} className="border px-2 py-1 text-[10px] uppercase" style={{ opacity: intake.expectedDeliverables.includes(d) ? 1 : 0.4 }}>{d}</button>
          ))}
        </div>
      </Field>
      <AutosaveField label="Web — existing website" value={intake.webLanding.existingWebsite} onSave={(v) => updateIntake(projectId, { webLanding: { ...intake.webLanding, existingWebsite: v } })} rows={2} />
      <AutosaveField label="Web — landing page URL" value={intake.webLanding.existingLandingPage} onSave={(v) => updateIntake(projectId, { webLanding: { ...intake.webLanding, existingLandingPage: v } })} rows={2} />
      <AutosaveField label="Web — repository URL" value={intake.webLanding.repositoryUrl} onSave={(v) => updateIntake(projectId, { webLanding: { ...intake.webLanding, repositoryUrl: v } })} rows={2} />
      <form
        className="border border-white/10 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          addCompetitor({
            projectId,
            name: cmp.name,
            website: cmp.website,
            socialLinks: "",
            category: "",
            whyRelevant: cmp.whyRelevant,
            strengths: "",
            weaknesses: "",
            visualNotes: "",
            messagingNotes: "",
          });
          setCmp({ name: "", website: "", whyRelevant: "" });
        }}
      >
        <p className="mb-3 text-[11px] tracking-[0.14em] uppercase opacity-50">Competitor / benchmark</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={inputClass} placeholder="Name" value={cmp.name} onChange={(e) => setCmp({ ...cmp, name: e.target.value })} />
          <input className={inputClass} placeholder="Website" value={cmp.website} onChange={(e) => setCmp({ ...cmp, website: e.target.value })} />
          <input className={inputClass} placeholder="Why relevant" value={cmp.whyRelevant} onChange={(e) => setCmp({ ...cmp, whyRelevant: e.target.value })} />
        </div>
        <button type="submit" className={`${btnGhost} mt-3`}>Add benchmark</button>
      </form>
      {competitors.length ? (
        <ul className="space-y-2">
          {competitors.map((c) => (
            <li key={c.id} className="text-sm opacity-70">{c.name} — {c.whyRelevant}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function ReviewStep({
  projectId,
  basics,
  intake,
  sources,
  references,
}: {
  projectId: string;
  basics: BasicsForm;
  intake: import("@/core/ops/intake").ProjectIntake | null;
  sources: import("@/core/ops/intake").ProjectSource[];
  references: import("@/core/ops/intake").ProjectReference[];
}) {
  return (
    <div className="space-y-4 text-sm">
      <p className="opacity-50">Review before creating. You can enrich context anytime from the project workspace.</p>
      <div className="border border-white/10 p-4">
        <p><strong>{basics.code}</strong> {basics.name}</p>
        <p className="opacity-50">{basics.clientName} · {basics.types.join(", ")}</p>
        <p className="mt-2 opacity-60">{basics.description}</p>
      </div>
      {intake?.brandProduct.whatIsIt ? (
        <div className="border border-white/10 p-4">
          <p className="text-[10px] uppercase opacity-40">What it is</p>
          <p className="mt-1">{intake.brandProduct.whatIsIt.slice(0, 200)}…</p>
        </div>
      ) : null}
      <p className="opacity-40">{sources.length} sources · {references.length} references · {intake?.expectedDeliverables.length ?? 0} deliverables planned</p>
      <Link href={`/projects/${projectId}/overview`} className="text-[#7ecba8] text-xs uppercase">Preview workspace →</Link>
    </div>
  );
}
