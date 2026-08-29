import { buildEffectiveProjects, effectiveWorkspaceDiagnostics } from "@/core/repository/hydrate";
import type { AppPersist } from "@/core/types";

export type ImportStats = {
  projectCount: number;
  designCount: number;
  projectIds: string[];
  effectiveProjectIds: string[];
  seedProjectIds: string[];
  opsProjectIds: string[];
  overlayProjectIds: string[];
  userProjectCount: number;
  opsProjectCount: number;
  templateCount: number;
  sourceCount: number;
  campaignCount: number;
};

export function countImportPayload(persist: AppPersist): ImportStats {
  const allProjects = buildEffectiveProjects(persist);
  const diagnostics = effectiveWorkspaceDiagnostics(persist);
  const projectIds = allProjects.map((p) => p.id);
  const designCount = allProjects.reduce((n, p) => n + p.posts.length, 0);

  return {
    projectCount: projectIds.length,
    designCount,
    projectIds,
    ...diagnostics,
    userProjectCount: persist.userProjects.length,
    opsProjectCount: persist.ops.projects.length,
    templateCount: persist.ops.designTemplates.length,
    sourceCount: persist.ops.sources.length,
    campaignCount: persist.ops.campaigns.length,
  };
}
