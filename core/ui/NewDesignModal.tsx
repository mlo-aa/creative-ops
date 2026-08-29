"use client";

import { useStudio } from "@/core/store";
import { useProject } from "@/core/project/context";
import type { GenerateDesignBrief } from "@/core/design/generation/provider";
import { btnGhost, btnPrimary, inputClass } from "@/core/ui/OpsField";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Mode = "choose" | "blank" | "template" | "generate";

export function NewDesignModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const project = useProject();
  const {
    createBlankDesign,
    createDesignFromTemplate,
    generateDesign,
    listProjectDesignTemplates,
    ops,
  } = useStudio();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState<GenerateDesignBrief>({
    brief: "",
    platform: "instagram",
    format: "post",
    outputKind: "static",
    creativeFreedom: "medium",
    referencePostIds: [],
    inspirationIds: [],
  });

  const templates = useMemo(
    () => listProjectDesignTemplates(project.id),
    [listProjectDesignTemplates, project.id],
  );

  if (!open) return null;

  function go(id: string) {
    onClose();
    setMode("choose");
    router.push(`/projects/${project.id}/posts/${id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto border border-white/15 bg-[#171717] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === "choose" ? (
          <>
            <h2 className="text-xl tracking-[-0.03em]">New design</h2>
            <p className="mt-2 text-sm opacity-50">Create an editable design — not a flattened export.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <button type="button" className="border border-white/10 p-4 text-left hover:border-white/25" onClick={() => setMode("blank")}>
                <p className="font-medium">Blank</p>
                <p className="mt-1 text-xs opacity-45">Empty 1080×1440 canvas</p>
              </button>
              <button type="button" className="border border-white/10 p-4 text-left hover:border-white/25" onClick={() => setMode("template")}>
                <p className="font-medium">From template</p>
                <p className="mt-1 text-xs opacity-45">Reusable project or global layout</p>
              </button>
              <button type="button" className="border border-white/10 p-4 text-left hover:border-white/25" onClick={() => setMode("generate")}>
                <p className="font-medium">Generate with AI</p>
                <p className="mt-1 text-xs opacity-45">Mock provider · editable output</p>
              </button>
            </div>
          </>
        ) : null}

        {mode === "blank" ? (
          <>
            <button type="button" className="text-xs uppercase opacity-40" onClick={() => setMode("choose")}>← Back</button>
            <h2 className="mt-4 text-xl">Blank canvas</h2>
            <input className={`${inputClass} mt-6`} placeholder="Design title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button
              type="button"
              className={`${btnPrimary} mt-4`}
              onClick={() => go(createBlankDesign(project.id, title || "Untitled design"))}
            >
              Create blank design
            </button>
          </>
        ) : null}

        {mode === "template" ? (
          <>
            <button type="button" className="text-xs uppercase opacity-40" onClick={() => setMode("choose")}>← Back</button>
            <h2 className="mt-4 text-xl">From template</h2>
            <input className={`${inputClass} mt-4`} placeholder="Design title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="mt-4 max-h-64 space-y-2 overflow-auto">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full border border-white/10 px-3 py-2 text-left"
                  style={{ borderColor: templateId === t.id ? "rgba(126,203,168,0.5)" : undefined }}
                  onClick={() => setTemplateId(t.id)}
                >
                  <p className="text-sm">{t.name}</p>
                  <p className="text-[10px] uppercase opacity-40">{t.mode} · {t.tags.slice(0, 3).join(", ")}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`${btnPrimary} mt-4`}
              disabled={!templateId}
              onClick={() => go(createDesignFromTemplate(project.id, templateId, title || undefined))}
            >
              Create from template
            </button>
          </>
        ) : null}

        {mode === "generate" ? (
          <>
            <button type="button" className="text-xs uppercase opacity-40" onClick={() => setMode("choose")}>← Back</button>
            <h2 className="mt-4 text-xl">Generate with AI</h2>
            <p className="mt-1 text-xs opacity-40">Uses project brand, strategy, assets, and references. Mock provider until API is connected.</p>
            <div className="mt-6 space-y-4">
              <textarea className={inputClass} rows={4} placeholder="Content / design brief" value={brief.brief} onChange={(e) => setBrief({ ...brief, brief: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className={inputClass} value={brief.platform} onChange={(e) => setBrief({ ...brief, platform: e.target.value })}>
                  {["instagram", "linkedin", "x", "tiktok", "website"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className={inputClass} value={brief.format} onChange={(e) => setBrief({ ...brief, format: e.target.value })}>
                  {["post", "carousel", "story", "reel"].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select className={inputClass} value={brief.outputKind} onChange={(e) => setBrief({ ...brief, outputKind: e.target.value as GenerateDesignBrief["outputKind"] })}>
                  <option value="static">Static</option>
                  <option value="animated">Animated / GIF</option>
                  <option value="carousel">Carousel</option>
                </select>
                <select className={inputClass} value={brief.creativeFreedom} onChange={(e) => setBrief({ ...brief, creativeFreedom: e.target.value as GenerateDesignBrief["creativeFreedom"] })}>
                  <option value="low">Creative freedom: low</option>
                  <option value="medium">Creative freedom: medium</option>
                  <option value="high">Creative freedom: high</option>
                </select>
              </div>
              <select
                className={inputClass}
                value={brief.campaignId ?? ""}
                onChange={(e) => setBrief({ ...brief, campaignId: e.target.value || undefined })}
              >
                <option value="">No campaign</option>
                {ops.campaigns.filter((c) => c.projectId === project.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div>
                <p className="mb-2 text-[10px] uppercase opacity-40">Inspiration items (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {ops.inspirations
                    .filter((i) => i.projectIds.length === 0 || i.projectIds.includes(project.id))
                    .map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        className="border px-2 py-1 text-[10px] uppercase"
                        style={{ opacity: brief.inspirationIds?.includes(i.id) ? 1 : 0.4 }}
                        onClick={() => {
                          const ids = new Set(brief.inspirationIds ?? []);
                          if (ids.has(i.id)) ids.delete(i.id);
                          else ids.add(i.id);
                          setBrief({ ...brief, inspirationIds: [...ids] });
                        }}
                      >
                        {i.title}
                      </button>
                    ))}
                  {ops.inspirations.filter((i) => i.projectIds.length === 0 || i.projectIds.includes(project.id)).length === 0 ? (
                    <span className="text-xs opacity-35">No inspiration items yet</span>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] uppercase opacity-40">Reference existing designs</p>
                <div className="flex flex-wrap gap-2">
                  {project.posts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="border px-2 py-1 text-[10px] uppercase"
                      style={{ opacity: brief.referencePostIds?.includes(p.id) ? 1 : 0.4 }}
                      onClick={() => {
                        const ids = new Set(brief.referencePostIds ?? []);
                        if (ids.has(p.id)) ids.delete(p.id);
                        else ids.add(p.id);
                        setBrief({ ...brief, referencePostIds: [...ids] });
                      }}
                    >
                      {p.number}
                    </button>
                  ))}
                </div>
              </div>
              <input className={inputClass} placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <button
              type="button"
              className={`${btnPrimary} mt-6`}
              disabled={generating || !brief.brief.trim()}
              onClick={async () => {
                setGenerating(true);
                try {
                  const id = await generateDesign(project.id, { ...brief, title: title || undefined });
                  go(id);
                } finally {
                  setGenerating(false);
                }
              }}
            >
              {generating ? "Generating…" : "Generate editable design"}
            </button>
          </>
        ) : null}

        <button type="button" className={`${btnGhost} mt-6`} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
