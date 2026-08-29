import { SEED_PROJECTS } from "@/projects";
import type { OpsPersist, OpsProject } from "@/core/ops/types";
import type { ProjectConfig } from "@/core/types";
import {
  emptyIntake,
  emptyKnowledge,
  type ProjectDecision,
  type ProjectSource,
} from "@/core/ops/intake";
import { computeContextLevel } from "@/core/ops/completeness";

const SEED_OPS: Record<
  string,
  Omit<OpsProject, "id" | "name" | "createdAt" | "updatedAt"> & { clientName: string }
> = {
  senda: {
    code: "CG-001",
    clientName: "Senda",
    type: "social",
    types: ["social", "branding", "strategy"],
    status: "active",
    color: "#173F35",
    deadline: "2026-09-30",
    description: "Social content for Senda — path visibility for social funding.",
    intakeCompleted: true,
    intakeStep: 7,
  },
  offerhub: {
    code: "CG-005",
    clientName: "Offer-Hub",
    type: "social",
    types: ["social", "campaign", "product"],
    status: "active",
    color: "#149A9B",
    deadline: "2026-09-30",
    description: "September Foundations — global freelance marketplace campaign.",
    intakeCompleted: true,
    intakeStep: 7,
  },
};

function normalizeOps(ops: OpsPersist): OpsPersist {
  return {
    ...ops,
    sources: ops.sources ?? [],
    references: ops.references ?? [],
    referenceBoards: ops.referenceBoards ?? [],
    decisions: ops.decisions ?? [],
    knowledge: ops.knowledge ?? {},
    intake: ops.intake ?? {},
    competitors: ops.competitors ?? [],
    designTemplates: ops.designTemplates ?? [],
    projects: ops.projects.map((p) => ({
      ...p,
      types: p.types?.length ? p.types : [p.type],
      status: p.status ?? "active",
    })),
    brandExtensions: Object.fromEntries(
      Object.entries(ops.brandExtensions ?? {}).map(([k, v]) => [
        k,
        { ...v, moodboardSections: v.moodboardSections ?? [] },
      ]),
    ),
  };
}

function seedRichProjectData(next: OpsPersist, projectId: string): OpsPersist {
  if (next.intake[projectId]) return next;
  const now = new Date().toISOString();

  if (projectId === "senda") {
    const intake = emptyIntake(projectId);
    intake.intakeCompleted = true;
    intake.intakeDraft = false;
    intake.intakeStep = 7;
    intake.brandProduct = {
      ...intake.brandProduct,
      whatIsIt: "Senda is a platform for path visibility in social funding — helping organizations show the journey from funds to impact.",
      problemSolved: "Social funding lacks transparency and narrative around how money becomes outcomes.",
      whoIsItFor: "NGOs, funders, and social impact organizations.",
      primaryUsers: ["NGOs", "Funders", "Social impact teams"],
      currentStage: "live",
      previousBrand: "TrustBid",
      currentPositioning: "Human, path-focused social funding visibility.",
      currentSlogan: "",
    };
    intake.creativeDirection = {
      ...intake.creativeDirection,
      brandPersonality: ["Human", "Confident", "Modern", "Accessible"],
      visualDirection: "Forest green palette, editorial typography, path/progress motifs.",
      logoStatus: "existing",
      sloganStatus: "exploring",
      wordsToAvoid: "From funds to impact.",
    };
    intake.channels = ["Instagram", "LinkedIn", "Website"];
    intake.expectedDeliverables = ["Instagram feed", "Social campaign", "Brandbook"];

    const knowledge = emptyKnowledge(projectId);
    knowledge.confirmedFacts = "Senda evolved from TrustBid. Brand uses forest green (#173F35).";
    knowledge.avoidDoNotUse = 'Do not use "From funds to impact." as primary messaging.';
    knowledge.terminology = "Use Senda (not TrustBid). Path/progress language preferred.";
    knowledge.openQuestions = "Final slogan direction.";

    const decisions: ProjectDecision[] = [
      {
        id: "senda-dec-1",
        projectId: "senda",
        decision: 'Use "Senda" as the brand name',
        rationale: "Simple, human, represents path / progress. Replaces TrustBid.",
        date: "2025-06-01",
        status: "current",
        area: "brand",
        sourceId: "",
        person: "",
        supersededBy: "",
        createdAt: now,
        updatedAt: now,
      },
    ];

    return {
      ...next,
      intake: { ...next.intake, [projectId]: intake },
      knowledge: { ...next.knowledge, [projectId]: knowledge },
      decisions: [...next.decisions, ...decisions],
      strategies: {
        ...next.strategies,
        [projectId]: {
          ...(next.strategies[projectId] ?? { projectId, updatedAt: now }),
          projectId,
          objective: "Build brand awareness and trust for Senda's social funding platform.",
          targetAudience: "NGOs, funders, social impact organizations.",
          valueProposition: "Visibility for the path from funding to impact.",
          keyMessages: "Path, progress, transparency, human impact.",
          positioning: "The platform that makes social funding journeys visible.",
          updatedAt: now,
        } as OpsPersist["strategies"][string],
      },
    };
  }

  if (projectId === "offerhub") {
    const intake = emptyIntake(projectId);
    intake.intakeCompleted = true;
    intake.intakeDraft = false;
    intake.intakeStep = 7;
    intake.brandProduct = {
      ...intake.brandProduct,
      whatIsIt: "Offer-Hub is a global freelance marketplace with secure escrow payments.",
      problemSolved: "Freelancers and clients need trust, security, and global reach without friction.",
      whoIsItFor: "Freelancers and clients worldwide.",
      primaryUsers: ["Freelancers", "Clients", "Remote teams"],
      currentStage: "live",
      technology: ["Stellar", "Web3", "Escrow"],
      currentPositioning: "Global freelance marketplace with secure payments.",
      currentSlogan: "",
    };
    intake.creativeDirection = {
      ...intake.creativeDirection,
      brandPersonality: ["Confident", "Global", "Editorial", "Technical but accessible"],
      visualDirection: "Navy + teal, editorial posters, texture layers, bold typography, photography.",
      typographyDirection: "Sora — headlines and body.",
      colorDirection: "Navy #19213D, Teal #149A9B, White #F1F3F7.",
      logoStatus: "existing",
      sloganStatus: "pending",
      wordsToAvoid: "Blockchain as primary value proposition.",
    };
    intake.channels = ["Instagram", "LinkedIn", "Website", "Landing page"];
    intake.expectedDeliverables = ["Instagram feed", "GIF posts", "Landing page", "Social campaign"];

    const knowledge = emptyKnowledge(projectId);
    knowledge.confirmedFacts = "Offer-Hub uses Sora typography. Navy/teal brand palette. September Foundations campaign.";
    knowledge.avoidDoNotUse = "Do not communicate blockchain as the primary value proposition.";
    knowledge.terminology = "Use Offer-Hub. Escrow and trust language over crypto jargon.";

    const decisions: ProjectDecision[] = [
      {
        id: "oh-dec-1",
        projectId: "offerhub",
        decision: "Editorial art direction with offerhub_texture.png as campaign signature",
        rationale: "Move away from plain corporate SaaS look. GrantFox/Zenthik energy without literal copy.",
        date: "2026-08-01",
        status: "current",
        area: "design",
        sourceId: "",
        person: "",
        supersededBy: "",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const sources: ProjectSource[] = [
      {
        id: "oh-src-texture",
        projectId: "offerhub",
        title: "Campaign texture signature",
        sourceType: "file",
        category: "inspiration",
        url: "",
        fileData: "",
        fileName: "offerhub_texture.png",
        fileMime: "image/png",
        content: "",
        description: "Recurring campaign texture used across editorial posts.",
        tags: ["texture", "campaign"],
        priority: "primary",
        status: "current",
        isSourceOfTruth: true,
        supersededBy: "",
        extractedText: "",
        notes: "Located at /public/offerhub_texture.png",
        relatedDecisionIds: ["oh-dec-1"],
        relatedContentIds: [],
        relatedDeliverableIds: [],
        dateAdded: now,
        createdAt: now,
        updatedAt: now,
      },
    ];

    return {
      ...next,
      intake: { ...next.intake, [projectId]: intake },
      knowledge: { ...next.knowledge, [projectId]: knowledge },
      decisions: [...next.decisions, ...decisions],
      sources: [...next.sources, ...sources],
      strategies: {
        ...next.strategies,
        [projectId]: {
          ...(next.strategies[projectId] ?? { projectId, updatedAt: now }),
          projectId,
          objective: "September Foundations — introduce brand, trust, payments, and product storytelling.",
          targetAudience: "Global freelancers and clients.",
          valueProposition: "Secure global freelance marketplace with escrow.",
          keyMessages: "Trust, global reach, secure payments, editorial brand energy.",
          campaignTimeline: "September 2026 — 9 posts (5 JPG + 4 GIF).",
          updatedAt: now,
        } as OpsPersist["strategies"][string],
      },
    };
  }

  return next;
}

export function ensureOpsMigration(
  ops: OpsPersist,
  studioProjects: ProjectConfig[],
): OpsPersist {
  let next = normalizeOps(ops);
  const existingIds = new Set(next.projects.map((p) => p.id));
  let counter = next.projectCodeCounter;

  for (const project of studioProjects) {
    if (existingIds.has(project.id)) continue;
    const seed = SEED_OPS[project.id];
    const now = new Date().toISOString();
    if (seed) {
      next = {
        ...next,
        projects: [
          ...next.projects,
          {
            id: project.id,
            code: seed.code,
            name: project.name,
            clientName: seed.clientName,
            type: seed.type,
            types: seed.types ?? [seed.type],
            status: seed.status,
            color: seed.color,
            deadline: seed.deadline,
            description: seed.description,
            intakeCompleted: seed.intakeCompleted,
            intakeStep: seed.intakeStep,
            createdAt: project.createdAt,
            updatedAt: now,
          },
        ],
      };
    } else {
      counter += 1;
      const code = `CG-${String(counter).padStart(3, "0")}`;
      next = {
        ...next,
        projectCodeCounter: counter,
        projects: [
          ...next.projects,
          {
            id: project.id,
            code,
            name: project.name,
            clientName: project.brand.name,
            type: "other",
            types: ["other"],
            status: "active",
            color: project.brand.colors[0]?.hex ?? "#6D758F",
            createdAt: project.createdAt,
            updatedAt: now,
          },
        ],
      };
    }
    existingIds.add(project.id);
  }

  // Normalize existing seed projects
  next = {
    ...next,
    projects: next.projects.map((p) => {
      const seed = SEED_OPS[p.id];
      if (!seed) return p;
      return {
        ...p,
        types: p.types?.length ? p.types : seed.types ?? [seed.type],
        intakeCompleted: p.intakeCompleted ?? seed.intakeCompleted,
        intakeStep: p.intakeStep ?? seed.intakeStep,
      };
    }),
  };

  // Rich seed data for senda and offerhub
  for (const id of ["senda", "offerhub"] as const) {
    if (studioProjects.some((p) => p.id === id)) {
      next = seedRichProjectData(next, id);
    }
  }

  // Ensure seed campaigns exist for offerhub
  if (
    studioProjects.some((p) => p.id === "offerhub") &&
    !next.campaigns.some((c) => c.projectId === "offerhub")
  ) {
    next = {
      ...next,
      campaigns: [
        ...next.campaigns,
        {
          id: "offerhub-foundations",
          projectId: "offerhub",
          name: "September 2026 — Foundations",
          objective: "Brand introduction, trust, payments, and product storytelling.",
          startDate: "2026-09-01",
          endDate: "2026-09-30",
          status: "active",
          kpis: "",
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  // Update context levels
  next = {
    ...next,
    projects: next.projects.map((p) => ({
      ...p,
      contextLevel: computeContextLevel(
        next,
        p.id,
        studioProjects.find((s) => s.id === p.id),
      ),
    })),
  };

  return next;
}

export function opsProjectFor(
  ops: OpsPersist,
  projectId: string,
  fallback?: ProjectConfig,
): OpsProject | undefined {
  return (
    ops.projects.find((p) => p.id === projectId) ??
    (fallback
      ? {
          id: projectId,
          code: "—",
          name: fallback.name,
          clientName: fallback.brand.name,
          type: "other",
          types: ["other"],
          status: "active",
          color: fallback.brand.colors[0]?.hex ?? "#6D758F",
          createdAt: fallback.createdAt,
          updatedAt: new Date().toISOString(),
        }
      : undefined)
  );
}

export function nextProjectCode(ops: OpsPersist): string {
  const counter = ops.projectCodeCounter + 1;
  return `CG-${String(counter).padStart(3, "0")}`;
}
