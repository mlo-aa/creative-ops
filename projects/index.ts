import { offerhubProject } from "@/projects/offerhub";
import { sendaProject } from "@/projects/senda";
import type { ProjectConfig } from "@/core/types";

export const SEED_PROJECTS: ProjectConfig[] = [sendaProject, offerhubProject];

export function getSeedProject(id: string) {
  return SEED_PROJECTS.find((project) => project.id === id);
}
