import type { ProjectConfig } from "@/core/types";
import type { OpsPersist, OpsProject, ProjectStrategy } from "@/core/ops/types";
import type {
  CreativeDirection,
  KnowledgeNotes,
  ProjectIntake,
  ProjectSource,
  ProjectReference,
  ProjectDecision,
  CompetitorBenchmark,
} from "@/core/ops/intake";
import { computeContextLevel } from "@/core/ops/completeness";

/** AI-ready structured project context package. */
export type ProjectContextPackage = {
  project: OpsProject;
  studio: {
    name: string;
    brandName: string;
    tagline: string;
    description: string;
    colors: { name: string; hex: string }[];
    fonts: Record<string, string>;
  };
  intake: ProjectIntake | null;
  strategy: ProjectStrategy;
  knowledge: KnowledgeNotes | null;
  creativeDirection: CreativeDirection | null;
  decisions: ProjectDecision[];
  sources: ProjectSource[];
  references: ProjectReference[];
  competitors: CompetitorBenchmark[];
  constraints: {
    avoidDoNotUse: string;
    terminology: string;
    wordsToAvoid: string;
  };
  content: {
    items: OpsPersist["contentItems"];
    campaigns: OpsPersist["campaigns"];
    deliverables: OpsPersist["deliverables"];
  };
  posts: { id: string; title: string; number: string; status: string }[];
  contextLevel: "basic" | "developing" | "rich";
  generatedAt: string;
};

export function getProjectContext(
  ops: OpsPersist,
  projectId: string,
  studioProject?: ProjectConfig,
): ProjectContextPackage | null {
  const project = ops.projects.find((p) => p.id === projectId);
  if (!project) return null;

  const intake = ops.intake[projectId] ?? null;
  const strategy = ops.strategies[projectId] ?? {
    projectId,
    targetAudience: "",
    valueProposition: "",
    channels: "",
    keyMessages: "",
    kpis: "",
    campaignTimeline: "",
    problem: "",
    objective: "",
    positioning: "",
    competitors: "",
    risks: "",
    notes: "",
    projectObjective: "",
    businessObjective: "",
    communicationObjective: "",
    audience: "",
    userProblem: "",
    proofPoints: "",
    constraints: "",
    successCriteria: "",
    updatedAt: "",
  };
  const knowledge = ops.knowledge[projectId] ?? null;
  const creativeDirection = intake?.creativeDirection ?? null;
  const decisions = ops.decisions.filter((d) => d.projectId === projectId && d.status === "current");
  const sources = ops.sources.filter((s) => s.projectId === projectId && s.status !== "archived");
  const references = ops.references.filter((r) => r.projectId === projectId);
  const competitors = ops.competitors.filter((c) => c.projectId === projectId);

  const brand = studioProject?.brand;

  return {
    project,
    studio: {
      name: studioProject?.name ?? project.name,
      brandName: brand?.name ?? project.clientName,
      tagline: brand?.tagline ?? "",
      description: brand?.description ?? project.description ?? "",
      colors: (brand?.colors ?? []).map((c) => ({ name: c.name, hex: c.hex })),
      fonts: brand?.fonts ?? {},
    },
    intake,
    strategy,
    knowledge,
    creativeDirection,
    decisions,
    sources: sources.filter((s) => s.isSourceOfTruth || s.priority === "primary"),
    references,
    competitors,
    constraints: {
      avoidDoNotUse: knowledge?.avoidDoNotUse ?? "",
      terminology: knowledge?.terminology ?? "",
      wordsToAvoid: creativeDirection?.wordsToAvoid ?? "",
    },
    content: {
      items: ops.contentItems.filter((c) => c.projectId === projectId),
      campaigns: ops.campaigns.filter((c) => c.projectId === projectId),
      deliverables: ops.deliverables.filter((d) => d.projectId === projectId),
    },
    posts: (studioProject?.posts ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      number: p.number,
      status: p.status,
    })),
    contextLevel: computeContextLevel(ops, projectId, studioProject),
    generatedAt: new Date().toISOString(),
  };
}
