"use client";

import { createContext, useContext } from "react";
import { GENERIC_PATHS } from "@/core/design";
import { getFormat, safeInset } from "@/core/formats";
import { hexOf } from "@/core/color";
import type { ProjectConfig } from "@/core/types";

const ProjectContext = createContext<ProjectConfig | null>(null);

export function ProjectScope({
  project,
  children,
}: {
  project: ProjectConfig;
  children: React.ReactNode;
}) {
  return (
    <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const project = useContext(ProjectContext);
  if (!project) throw new Error("useProject must be used inside a project workspace");
  return project;
}

export function useBrand() {
  const project = useProject();
  const format = getFormat(project.formatId);
  return {
    project,
    format,
    safe: safeInset(format.width),
    font: {
      display: project.brand.fonts.display,
      body: project.brand.fonts.body,
      primary: project.brand.fonts.primary,
    },
    hex: (id: string) => hexOf(project.brand, id),
    logo: (role: "isotipo" | "wordmark" | "primary") =>
      project.brand.logos.find((item) => item.role === role) ??
      project.brand.logos[0],
    path: (id: string) =>
      project.graphics?.paths[id] ?? GENERIC_PATHS[id] ?? GENERIC_PATHS.arc,
    shortName: project.brand.shortName,
  };
}
