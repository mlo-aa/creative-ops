/**
 * Project row mapping — candidate fields + live-schema filtering.
 */

import type { OpsProject } from "@/core/ops/types";
import type { ProjectConfig } from "@/core/types";
import { partitionProjectRowForLiveSchema } from "@/core/repositories/live-schema";

/** All mappable project fields (superset). Filtered against live columns before upsert. */
export function buildProjectRowCandidate(
  project: ProjectConfig,
  opsProject: OpsProject | undefined,
  isSeed: boolean,
): Record<string, unknown> {
  return {
    id: project.id,
    code: opsProject?.code ?? "",
    name: project.name,
    client_name: opsProject?.clientName ?? project.brand.name,
    description: opsProject?.description ?? "",
    status: opsProject?.status ?? "active",
    project_color: opsProject?.color ?? project.brand.colors[0]?.hex ?? "#6D758F",
    start_date: opsProject?.startDate ?? null,
    deadline: opsProject?.deadline ?? null,
    updated_at: new Date().toISOString(),
    types: opsProject?.types ?? ["other"],
    intake_step: opsProject?.intakeStep ?? 0,
    intake_done: opsProject?.intakeCompleted ?? false,
    is_seed: isSeed,
    format_id: project.formatId,
    export_prefix: project.exportPrefix,
    brand: project.brand,
    graphics: project.graphics ?? null,
  };
}

export function mapProjectToLiveRow(
  project: ProjectConfig,
  opsProject: OpsProject | undefined,
  isSeed: boolean,
  liveColumns: readonly string[],
): { row: Record<string, unknown>; overflow: Record<string, unknown> } {
  const candidate = buildProjectRowCandidate(project, opsProject, isSeed);
  return partitionProjectRowForLiveSchema(candidate, liveColumns);
}

/** Brand, graphics, format + columns absent from live `projects` table. */
export function projectBrandExtensionRow(
  project: ProjectConfig,
  opsData: Record<string, unknown> | undefined,
  overflow: Record<string, unknown> = {},
): { project_id: string; data: Record<string, unknown>; updated_at: string } {
  return {
    project_id: project.id,
    data: {
      ...(opsData ?? {}),
      ...overflow,
      brand: project.brand,
      graphics: project.graphics ?? null,
      formatId: project.formatId,
      exportPrefix: project.exportPrefix,
    },
    updated_at: new Date().toISOString(),
  };
}

/** Merge intake fields when intake columns are not on live `projects` table. */
export function projectIntakeOverflowRow(
  projectId: string,
  existingIntake: Record<string, unknown> | undefined,
  overflow: Record<string, unknown>,
): { project_id: string; data: Record<string, unknown>; updated_at: string } | null {
  const intakeKeys = ["intake_step", "intake_done", "types"];
  const intakeOverflow: Record<string, unknown> = {};
  for (const key of intakeKeys) {
    if (key in overflow) intakeOverflow[key] = overflow[key];
  }
  if (!Object.keys(intakeOverflow).length && !existingIntake) return null;
  return {
    project_id: projectId,
    data: { ...(existingIntake ?? {}), ...intakeOverflow },
    updated_at: new Date().toISOString(),
  };
}
