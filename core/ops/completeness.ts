import type { ProjectConfig } from "@/core/types";
import type { OpsPersist } from "@/core/ops/types";
import type { ContextLevel } from "@/core/ops/intake";

export function computeContextLevel(
  ops: OpsPersist,
  projectId: string,
  studioProject?: ProjectConfig,
): ContextLevel {
  let score = 0;

  const strategies = ops?.strategies ?? {};
  const strategy = strategies[projectId];
  if (strategy?.valueProposition || strategy?.objective || strategy?.projectObjective) score += 1;

  const sources = ops?.sources ?? [];
  if (sources.filter((s) => s.projectId === projectId).length >= 1) score += 1;
  if (sources.filter((s) => s.projectId === projectId).length >= 3) score += 1;

  const brand = studioProject?.brand;
  if (brand?.colors?.length && brand.logos?.length) score += 1;

  const references = ops?.references ?? [];
  if (references.filter((r) => r.projectId === projectId).length >= 1) score += 1;

  const deliverables = ops?.deliverables ?? [];
  if (deliverables.filter((d) => d.projectId === projectId).length >= 1) score += 1;

  const intakeMap = ops?.intake ?? {};
  const intake = intakeMap[projectId];
  if (intake?.brandProduct?.whatIsIt) score += 1;

  const knowledgeMap = ops?.knowledge ?? {};
  const knowledge = knowledgeMap[projectId];
  if (knowledge?.confirmedFacts || knowledge?.avoidDoNotUse) score += 1;

  if (score <= 2) return "basic";
  if (score <= 5) return "developing";
  return "rich";
}

export function contextLevelLabel(level: ContextLevel): string {
  switch (level) {
    case "basic":
      return "Basic";
    case "developing":
      return "Developing";
    case "rich":
      return "Rich";
  }
}
