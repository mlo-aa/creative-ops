import type { ProjectConfig } from "@/core/types";
import type { OpsPersist } from "@/core/ops/types";
import type { ContextLevel } from "@/core/ops/intake";

export function computeContextLevel(
  ops: OpsPersist,
  projectId: string,
  studioProject?: ProjectConfig,
): ContextLevel {
  let score = 0;

  const strategy = ops.strategies[projectId];
  if (strategy?.valueProposition || strategy?.objective || strategy?.projectObjective) score += 1;

  const sources = ops.sources.filter((s) => s.projectId === projectId);
  if (sources.length >= 1) score += 1;
  if (sources.length >= 3) score += 1;

  const brand = studioProject?.brand;
  if (brand?.colors?.length && brand.logos?.length) score += 1;

  const refs = ops.references.filter((r) => r.projectId === projectId);
  if (refs.length >= 1) score += 1;

  const deliverables = ops.deliverables.filter((d) => d.projectId === projectId);
  if (deliverables.length >= 1) score += 1;

  const intake = ops.intake[projectId];
  if (intake?.brandProduct?.whatIsIt) score += 1;

  const knowledge = ops.knowledge[projectId];
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
