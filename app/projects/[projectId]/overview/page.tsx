"use client";

import { contextLevelLabel, computeContextLevel } from "@/core/ops/completeness";
import { useStudio } from "@/core/store";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SectionHeader, StatusPill } from "@/core/ui/OpsField";
import { CollapsibleSection } from "@/core/ui/workspace-ui";

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const {
    getProject,
    getOpsProject,
    getIntake,
    getStrategy,
    getKnowledge,
    getProjectContext,
    ops,
  } = useStudio();

  const project = getProject(params.projectId);
  const op = getOpsProject(params.projectId);
  const intake = getIntake(params.projectId);
  const strategy = getStrategy(params.projectId);
  const knowledge = getKnowledge(params.projectId);
  const ctx = getProjectContext(params.projectId);

  const level = computeContextLevel(ops, params.projectId, project);
  const activePhases = ops.phases.filter((p) => p.projectId === params.projectId && p.status === "active");
  const upcomingDeliverables = ops.deliverables
    .filter((d) => d.projectId === params.projectId && d.status !== "delivered")
    .slice(0, 5);
  const recentDecisions = ops.decisions
    .filter((d) => d.projectId === params.projectId && d.status === "current")
    .slice(0, 5);
  const keySources = ops.sources
    .filter((s) => s.projectId === params.projectId && (s.isSourceOfTruth || s.priority === "primary"))
    .slice(0, 5);
  const keyRefs = ops.references.filter((r) => r.projectId === params.projectId).slice(0, 4);
  const linkCount = ops.links.filter((l) => l.projectId === params.projectId).length;
  const sourceCount = ops.sources.filter((s) => s.projectId === params.projectId).length;
  const contentCount = ops.contentItems.filter((c) => c.projectId === params.projectId).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <SectionHeader
        title="Overview"
        action={
          <div className="flex items-center gap-3">
            <StatusPill color={op?.color}>{contextLevelLabel(level)}</StatusPill>
            <Link href={`/projects/new/intake?projectId=${params.projectId}`} className="text-[10px] uppercase text-[#7ecba8]">
              Enrich intake
            </Link>
          </div>
        }
      />

      {/* Project brief — read like a document, not a database. */}
      <div className="space-y-5 text-sm">
        <Brief label="What it is">
          {intake.brandProduct.whatIsIt || project?.brand.description || op?.description || "—"}
        </Brief>
        <Brief label="Current stage">
          <span className="capitalize">{String(intake.brandProduct.currentStage).replace("_", " ")}</span>
        </Brief>
        <Brief label="Objective">{strategy.projectObjective || strategy.objective || "—"}</Brief>
        <Brief label="Audience">
          {strategy.audience || strategy.targetAudience || intake.brandProduct.whoIsItFor || "—"}
        </Brief>
        <Brief label="Key message">{strategy.keyMessages || "—"}</Brief>
        <Brief label="Creative direction">
          {intake.creativeDirection.visualDirection || intake.creativeDirection.brandPersonality.join(", ") || "—"}
        </Brief>
      </div>

      {knowledge.avoidDoNotUse ? (
        <section className="mt-8 border border-red-900/30 bg-red-950/10 p-4">
          <h3 className="text-[10px] tracking-[0.16em] uppercase opacity-50">Avoid / Do not use</h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{knowledge.avoidDoNotUse}</p>
        </section>
      ) : null}

      {/* Deeper project context — progressive disclosure, not permanent tabs. */}
      <div className="mt-10 space-y-1">
        <CollapsibleSection
          title="Strategy"
          summary={`${strategy.positioning ? "Positioning set · " : ""}${activePhases.length} active phase${activePhases.length === 1 ? "" : "s"} · ${recentDecisions.length} decision${recentDecisions.length === 1 ? "" : "s"}`}
        >
          {strategy.positioning ? <p className="opacity-80">{strategy.positioning}</p> : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-[10px] tracking-[0.16em] uppercase opacity-45">Active phases</h4>
              {activePhases.length ? (
                <ul className="space-y-1.5">
                  {activePhases.map((p) => (
                    <li key={p.id} className="text-sm">{p.name} <span className="opacity-40">· {p.type}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm opacity-35">No active phases</p>
              )}
            </div>
            <div>
              <h4 className="mb-2 text-[10px] tracking-[0.16em] uppercase opacity-45">Recent decisions</h4>
              {recentDecisions.length ? (
                <ul className="space-y-2">
                  {recentDecisions.map((d) => (
                    <li key={d.id} className="border-l-2 pl-3 text-sm" style={{ borderColor: op?.color }}>
                      <p>{d.decision}</p>
                      {d.rationale ? <p className="text-xs opacity-45">{d.rationale}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm opacity-35">No decisions logged</p>
              )}
            </div>
          </div>

          <Link href={`/projects/${params.projectId}/strategy`} className="inline-block text-[10px] uppercase text-[#7ecba8]">
            Open strategy doc →
          </Link>
        </CollapsibleSection>

        <CollapsibleSection
          title="Knowledge"
          summary={`${sourceCount} source${sourceCount === 1 ? "" : "s"} · ${linkCount} link${linkCount === 1 ? "" : "s"} · ${keyRefs.length} reference${keyRefs.length === 1 ? "" : "s"}`}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-[10px] tracking-[0.16em] uppercase opacity-45">Important sources</h4>
              <ul className="space-y-1.5">
                {keySources.map((s) => (
                  <li key={s.id}>
                    <Link href={`/projects/${params.projectId}/sources/${s.id}`} className="text-sm text-[#7ecba8]">
                      {s.title}
                    </Link>
                    {s.isSourceOfTruth ? <span className="ml-2 text-[10px] opacity-40">SOT</span> : null}
                  </li>
                ))}
                {!keySources.length ? <p className="text-sm opacity-35">No sources yet</p> : null}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-[10px] tracking-[0.16em] uppercase opacity-45">Key references</h4>
              <ul className="space-y-1.5">
                {keyRefs.map((r) => (
                  <li key={r.id} className="text-sm">{r.title}</li>
                ))}
                {!keyRefs.length ? <p className="text-sm opacity-35">No references yet</p> : null}
              </ul>
            </div>
          </div>

          {knowledge.openQuestions ? (
            <div>
              <h4 className="mb-1 text-[10px] tracking-[0.16em] uppercase opacity-45">Open questions</h4>
              <p className="text-sm whitespace-pre-wrap opacity-70">{knowledge.openQuestions}</p>
            </div>
          ) : null}
          {knowledge.terminology ? (
            <div>
              <h4 className="mb-1 text-[10px] tracking-[0.16em] uppercase opacity-45">Terminology</h4>
              <p className="text-sm whitespace-pre-wrap opacity-70">{knowledge.terminology}</p>
            </div>
          ) : null}

          <div className="flex gap-4">
            <Link href={`/projects/${params.projectId}/sources`} className="text-[10px] uppercase text-[#7ecba8]">
              Manage sources →
            </Link>
            <Link href={`/projects/${params.projectId}/links`} className="text-[10px] uppercase text-[#7ecba8]">
              Manage links →
            </Link>
            <Link href={`/projects/${params.projectId}/references`} className="text-[10px] uppercase text-[#7ecba8]">
              Manage references →
            </Link>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Planning"
          summary={`${upcomingDeliverables.length} upcoming deliverable${upcomingDeliverables.length === 1 ? "" : "s"} · ${contentCount} content item${contentCount === 1 ? "" : "s"}`}
        >
          <div>
            <h4 className="mb-2 text-[10px] tracking-[0.16em] uppercase opacity-45">Upcoming deliverables</h4>
            {upcomingDeliverables.length ? (
              <ul className="space-y-1.5">
                {upcomingDeliverables.map((d) => (
                  <li key={d.id} className="text-sm">{d.name} <StatusPill>{d.status}</StatusPill></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-35">None yet</p>
            )}
          </div>

          <div className="flex gap-4">
            <Link href={`/projects/${params.projectId}/deliverables`} className="text-[10px] uppercase text-[#7ecba8]">
              Manage deliverables →
            </Link>
            <Link href={`/projects/${params.projectId}/content`} className="text-[10px] uppercase text-[#7ecba8]">
              Manage content plan →
            </Link>
          </div>
        </CollapsibleSection>
      </div>

      {ctx ? (
        <p className="mt-10 text-[10px] opacity-30">
          AI context package ready · {ctx.sources.length} primary sources · generated {new Date(ctx.generatedAt).toLocaleString()}
        </p>
      ) : null}
    </main>
  );
}

function Brief({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
      <h3 className="text-[10px] tracking-[0.16em] uppercase opacity-45">{label}</h3>
      <div className="opacity-85">{children}</div>
    </div>
  );
}
