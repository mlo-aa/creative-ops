import type { ProjectConfig } from "@/core/types";
import type { OpsPersist } from "@/core/ops/types";
import { getProjectContext } from "@/core/ops/context";

/** Structured creative context for AI design generation. */
export type ProjectCreativeContext = {
  projectId: string;
  projectName: string;
  clientName: string;
  brand: {
    name: string;
    tagline: string;
    description: string;
    colors: { id: string; name: string; hex: string }[];
    fonts: Record<string, string>;
    logos: { id: string; name: string; src: string; role: string }[];
    defaultBackground: string;
    defaultText: string;
    defaultAccent: string;
  };
  strategy: {
    objective: string;
    valueProposition: string;
    keyMessages: string;
    audience: string;
    positioning: string;
    constraints: string;
  };
  creativeDirection: {
    personality: string[];
    visualDirection: string;
    voiceAndTone: string;
    wordsToUse: string;
    wordsToAvoid: string;
    typographyDirection: string;
    colorDirection: string;
    logoStatus: string;
  };
  restrictions: {
    avoidDoNotUse: string;
    terminology: string;
  };
  assets: { id: string; name: string; src: string; category: string; tags: string[] }[];
  campaigns: { id: string; name: string; objective: string }[];
  references: { title: string; whatWeLike: string; whatNotToCopy: string; url: string }[];
  inspiration: { title: string; category: string; notes: string; imageSrc: string }[];
  existingPosts: {
    id: string;
    title: string;
    number: string;
    template: string;
    exportKind: string;
    headline: string;
    supporting: string;
  }[];
  contentItems: { id: string; title: string; platform: string; format: string; caption: string }[];
  approvedColorIds: string[];
  approvedFontRoles: string[];
};

export function getProjectCreativeContext(
  project: ProjectConfig,
  ops: OpsPersist,
): ProjectCreativeContext {
  const ctx = getProjectContext(ops, project.id, project);
  const intake = ctx?.intake;
  const cd = intake?.creativeDirection;
  const strategy = ctx?.strategy;
  const knowledge = ctx?.knowledge;

  return {
    projectId: project.id,
    projectName: project.name,
    clientName: ctx?.project.clientName ?? project.brand.name,
    brand: {
      name: project.brand.name,
      tagline: project.brand.tagline,
      description: project.brand.description,
      colors: project.brand.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
      fonts: project.brand.fonts,
      logos: project.brand.logos.map((l) => ({ id: l.id, name: l.name, src: l.src, role: l.role })),
      defaultBackground: project.brand.defaultBackground,
      defaultText: project.brand.defaultText,
      defaultAccent: project.brand.defaultAccent,
    },
    strategy: {
      objective: strategy?.projectObjective || strategy?.objective || "",
      valueProposition: strategy?.valueProposition || "",
      keyMessages: strategy?.keyMessages || "",
      audience: strategy?.audience || strategy?.targetAudience || "",
      positioning: strategy?.positioning || "",
      constraints: strategy?.constraints || strategy?.risks || "",
    },
    creativeDirection: {
      personality: cd?.brandPersonality ?? [],
      visualDirection: cd?.visualDirection || "",
      voiceAndTone: cd?.voiceAndTone || "",
      wordsToUse: cd?.wordsToUse || "",
      wordsToAvoid: cd?.wordsToAvoid || "",
      typographyDirection: cd?.typographyDirection || "",
      colorDirection: cd?.colorDirection || "",
      logoStatus: cd?.logoStatus || "pending",
    },
    restrictions: {
      avoidDoNotUse: knowledge?.avoidDoNotUse || ctx?.constraints.avoidDoNotUse || "",
      terminology: knowledge?.terminology || ctx?.constraints.terminology || "",
    },
    assets: project.assets.map((a) => ({
      id: a.id,
      name: a.name,
      src: a.src,
      category: a.category,
      tags: a.tags,
    })),
    campaigns: (ctx?.content.campaigns ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      objective: c.objective,
    })),
    references: (ctx?.references ?? []).map((r) => ({
      title: r.title,
      whatWeLike: r.whatWeLike,
      whatNotToCopy: r.whatNotToCopy,
      url: r.url,
    })),
    inspiration: ops.inspirations
      .filter((i) => i.projectIds.includes(project.id))
      .map((i) => ({
        title: i.title,
        category: i.category,
        notes: i.notes,
        imageSrc: i.imageSrc,
      })),
    existingPosts: project.posts.map((p) => ({
      id: p.id,
      title: p.title,
      number: p.number,
      template: p.template,
      exportKind: p.exportKind,
      headline: p.design.headline,
      supporting: p.design.supporting,
    })),
    contentItems: (ctx?.content.items ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      format: c.format,
      caption: c.caption,
    })),
    approvedColorIds: project.brand.colors.map((c) => c.id),
    approvedFontRoles: ["display", "body", "primary", "secondary"],
  };
}
