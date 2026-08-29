"use client";

import { contextLevelLabel, computeContextLevel } from "@/core/ops/completeness";
import { useStudio } from "@/core/store";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SectionHeader, StatusPill } from "@/core/ui/OpsField";

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

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <SectionHeader
        title="Overview"
        action={
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-[0.14em] uppercase opacity-40">Project context</span>
            <StatusPill color={op?.color}>{contextLevelLabel(level)}</StatusPill>
            <Link href={`/projects/new/intake?projectId=${params.projectId}`} className="text-[10px] uppercase text-[#7ecba8]">
              Enrich intake
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <OverviewBlock title="What it is">
          <p>{intake.brandProduct.whatIsIt || project?.brand.description || op?.description || "—"}</p>
          {intake.brandProduct.previousBrand ? (
            <p className="mt-2 text-xs opacity-45">Previously: {intake.brandProduct.previousBrand}</p>
          ) : null}
        </OverviewBlock>

        <OverviewBlock title="Current stage">
          <p className="capitalize">{String(intake.brandProduct.currentStage).replace("_", " ")}</p>
          {intake.brandProduct.currentSlogan ? <p className="mt-1 text-sm opacity-50">"{intake.brandProduct.currentSlogan}"</p> : null}
        </OverviewBlock>

        <OverviewBlock title="Objective">
          <p>{strategy.projectObjective || strategy.objective || "—"}</p>
        </OverviewBlock>

        <OverviewBlock title="Audience">
          <p>{strategy.audience || strategy.targetAudience || intake.brandProduct.whoIsItFor || "—"}</p>
        </OverviewBlock>

        <OverviewBlock title="Key message">
          <p>{strategy.keyMessages || "—"}</p>
        </OverviewBlock>

        <OverviewBlock title="Creative direction">
          <p>{intake.creativeDirection.visualDirection || intake.creativeDirection.brandPersonality.join(", ") || "—"}</p>
          <p className="mt-2 text-xs opacity-45">
            Logo: {intake.creativeDirection.logoStatus} · Slogan: {intake.creativeDirection.sloganStatus}
          </p>
        </OverviewBlock>

        <OverviewBlock title="Landing page">
          <p>{intake.webLanding.pageStatus} — {intake.webLanding.existingLandingPage || intake.webLanding.existingWebsite || "Not set"}</p>
        </OverviewBlock>

        <OverviewBlock title="Content">
          <p>{ops.contentItems.filter((c) => c.projectId === params.projectId).length} planned items · {project?.posts.length ?? 0} designs</p>
        </OverviewBlock>
      </div>

      {knowledge.avoidDoNotUse ? (
        <section className="mt-8 border border-red-900/30 bg-red-950/10 p-4">
          <h3 className="text-[10px] tracking-[0.16em] uppercase opacity-50">Avoid / Do not use</h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{knowledge.avoidDoNotUse}</p>
        </section>
      ) : null}

      {knowledge.terminology ? (
        <section className="mt-4 border border-white/10 p-4">
          <h3 className="text-[10px] tracking-[0.16em] uppercase opacity-50">Terminology</h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{knowledge.terminology}</p>
        </section>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-xs tracking-[0.16em] uppercase opacity-45">Active phases</h3>
          {activePhases.length ? (
            <ul className="space-y-2">
              {activePhases.map((p) => (
                <li key={p.id} className="text-sm">{p.name} <span className="opacity-40">· {p.type}</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-35">No active phases</p>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-xs tracking-[0.16em] uppercase opacity-45">Upcoming deliverables</h3>
          {upcomingDeliverables.length ? (
            <ul className="space-y-2">
              {upcomingDeliverables.map((d) => (
                <li key={d.id} className="text-sm">{d.name} <StatusPill>{d.status}</StatusPill></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-35">None yet</p>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-xs tracking-[0.16em] uppercase opacity-45">Recent decisions</h3>
          {recentDecisions.length ? (
            <ul className="space-y-3">
              {recentDecisions.map((d) => (
                <li key={d.id} className="border-l-2 pl-3 text-sm" style={{ borderColor: op?.color }}>
                  <p>{d.decision}</p>
                  <p className="text-xs opacity-45">{d.rationale}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-35">No decisions logged</p>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-xs tracking-[0.16em] uppercase opacity-45">Open questions</h3>
          <p className="text-sm whitespace-pre-wrap opacity-70">{knowledge.openQuestions || "—"}</p>
        </section>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-xs tracking-[0.16em] uppercase opacity-45">Important sources</h3>
          <ul className="space-y-2">
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
        </section>

        <section>
          <h3 className="mb-3 text-xs tracking-[0.16em] uppercase opacity-45">Key references</h3>
          <ul className="space-y-2">
            {keyRefs.map((r) => (
              <li key={r.id} className="text-sm">{r.title}</li>
            ))}
            {!keyRefs.length ? <p className="text-sm opacity-35">No references yet</p> : null}
          </ul>
        </section>
      </div>

      {ctx ? (
        <p className="mt-10 text-[10px] opacity-30">
          AI context package ready · {ctx.sources.length} primary sources · generated {new Date(ctx.generatedAt).toLocaleString()}
        </p>
      ) : null}
    </main>
  );
}

function OverviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 p-4">
      <h3 className="text-[10px] tracking-[0.16em] uppercase opacity-45">{title}</h3>
      <div className="mt-2 text-sm opacity-80">{children}</div>
    </div>
  );
}
