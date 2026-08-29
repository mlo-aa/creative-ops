import { SEED_PROJECTS } from "@/projects";
import { emptyDesign } from "@/core/design";
import type { BrandProfile, DesignState, StudioPost } from "@/core/types";
import type { DesignDocument, DesignTemplate } from "@/core/design/document";
import {
  blankCanvasDocument,
  cloneDocument,
  imageElement,
  logoElement,
  rectangleElement,
  textElement,
  textureElement,
} from "@/core/design/document";
import { documentToDesignState } from "@/core/design/generation/provider";

function legacyTemplate(
  id: string,
  name: string,
  projectId: string | undefined,
  sourcePostId: string,
  legacyTemplate: string,
  legacyDesign: Partial<DesignState>,
  tags: string[],
  exportKind?: StudioPost["exportKind"],
  durationMs?: number,
): DesignTemplate {
  return {
    id,
    name,
    description: `Reusable layout from ${sourcePostId}`,
    projectId,
    sourcePostId,
    tags,
    mode: "legacy",
    legacyTemplate,
    legacyDesign,
    exportKind,
    durationMs,
    createdAt: new Date().toISOString(),
  };
}

function documentTemplate(
  id: string,
  name: string,
  projectId: string | undefined,
  document: DesignDocument,
  tags: string[],
  sourcePostId?: string,
): DesignTemplate {
  return {
    id,
    name,
    description: `Document template — ${name}`,
    projectId,
    sourcePostId,
    tags,
    mode: "document",
    document,
    createdAt: new Date().toISOString(),
  };
}

function editorialDocumentFromPost(
  post: StudioPost,
  brand: BrandProfile,
  projectId: string,
): DesignDocument {
  const doc = blankCanvasDocument(brand);
  doc.metadata = {
    brief: post.title,
    generatedBy: "template",
    templateId: post.template,
    exportKind: post.exportKind,
    durationMs: post.durationMs,
  };
  doc.canvas.backgroundColorId = post.design.background;

  const elements = [
    rectangleElement({ zIndex: 0, props: { fillColorId: post.design.background } }, brand),
  ];

  if (post.design.textureVisible && post.design.textureSrc) {
    elements.push(
      textureElement({
        zIndex: 1,
        props: {
          src: post.design.textureSrc,
          scale: post.design.textureScale,
          opacity: post.design.textureOpacity,
          rotation: post.design.textureRotation,
          blur: post.design.textureBlur,
        },
      }),
    );
  }

  if (post.design.imageSrc) {
    elements.push(
      imageElement(
        {
          zIndex: 3,
          y: 480,
          height: 620,
          props: {
            src: post.design.imageSrc,
            objectX: post.design.imageObjectX,
            objectY: post.design.imageObjectY,
            overlayColorId: post.design.overlayColor,
            overlayOpacity: post.design.overlayIntensity,
            grayscale: post.design.imageGrayscale,
          },
        },
        brand,
      ),
    );
  }

  if (post.design.showLogo) {
    elements.push(
      logoElement(
        {
          zIndex: 20,
          x: 80 + post.design.logoX,
          y: 72 + post.design.logoY,
          props: { mode: post.design.logoMode, colorId: post.design.logoColor },
        },
        brand,
      ),
    );
  }

  if (post.design.eyebrow) {
    elements.push(
      textElement(
        {
          name: "Eyebrow",
          zIndex: 12,
          x: 80,
          y: 140,
          height: 40,
          props: {
            content: post.design.eyebrow,
            fontSize: 14,
            fontWeight: 500,
            colorId: post.design.accent,
            letterSpacing: "0.16em",
            uppercase: true,
          },
        },
        brand,
      ),
    );
  }

  if (post.design.headline) {
    elements.push(
      textElement(
        {
          name: "Headline",
          zIndex: 15,
          x: 80 + post.design.headlineX,
          y: 200 + post.design.headlineY,
          height: 320,
          props: {
            content: post.design.headline,
            fontSize: 80,
            fontWeight: 700,
            colorId: post.design.text,
            lineHeight: 0.95,
            uppercase: true,
          },
        },
        brand,
      ),
    );
  }

  if (post.design.supporting) {
    elements.push(
      textElement(
        {
          name: "Supporting",
          zIndex: 16,
          x: 80 + post.design.supportX,
          y: 520 + post.design.supportY,
          height: 180,
          props: {
            content: post.design.supporting,
            fontRole: "body",
            fontSize: 22,
            fontWeight: 400,
            colorId: post.design.text,
            lineHeight: 1.35,
          },
        },
        brand,
      ),
    );
  }

  doc.elements = elements;
  return doc;
}

function buildSeedTemplates(): DesignTemplate[] {
  const templates: DesignTemplate[] = [
    {
      id: "blank-canvas",
      name: "Blank canvas",
      description: "Empty 1080×1440 canvas",
      tags: ["blank"],
      mode: "document",
      document: blankCanvasDocument({
        name: "Blank",
        shortName: "blank",
        description: "",
        tagline: "",
        website: "",
        colors: [{ id: "bg", name: "Background", hex: "#111111" }],
        logos: [],
        fonts: {
          primary: "sans-serif",
          secondary: "sans-serif",
          display: "sans-serif",
          body: "sans-serif",
        },
        defaultBackground: "bg",
        defaultText: "bg",
        defaultAccent: "bg",
      }),
      createdAt: new Date().toISOString(),
    },
  ];

  for (const project of SEED_PROJECTS) {
    for (const post of project.posts) {
      if (post.status !== "active" && !post.variantOf) continue;
      templates.push(
        legacyTemplate(
          `${project.id}-${post.template}-${post.id}`,
          `${post.title}`,
          project.id,
          post.id,
          post.template,
          post.design,
          [project.id, post.template, post.exportKind],
          post.exportKind,
          post.durationMs,
        ),
      );

      if (post.kind === "single" && !post.variantOf) {
        templates.push(
          documentTemplate(
            `doc-${project.id}-${post.id}`,
            `${post.title} (document)`,
            project.id,
            editorialDocumentFromPost(post, project.brand, project.id),
            [project.id, "document", post.template],
            post.id,
          ),
        );
      }
    }
  }

  return templates;
}

export const SEED_DESIGN_TEMPLATES = buildSeedTemplates();

export function listDesignTemplates(projectId?: string, custom: DesignTemplate[] = []) {
  const all = [...SEED_DESIGN_TEMPLATES, ...custom];
  if (!projectId) return all;
  return all.filter((t) => !t.projectId || t.projectId === projectId);
}

export function getDesignTemplate(id: string, custom: DesignTemplate[] = []): DesignTemplate | undefined {
  return listDesignTemplates(undefined, custom).find((t) => t.id === id);
}

export function postToTemplate(
  projectId: string,
  post: StudioPost,
  brand: BrandProfile,
  name: string,
): DesignTemplate {
  if (post.document) {
    return documentTemplate(
      `saved-${post.id}-${Date.now()}`,
      name,
      projectId,
      cloneDocument(post.document),
      ["saved", projectId],
      post.id,
    );
  }
  return legacyTemplate(
    `saved-${post.id}-${Date.now()}`,
    name,
    projectId,
    post.id,
    post.template,
    post.design,
    ["saved", projectId],
    post.exportKind,
    post.durationMs,
  );
}

export function applyTemplateToBrand(
  template: DesignTemplate,
  brand: BrandProfile,
): { template: string; design: DesignState; document?: DesignDocument; exportKind: StudioPost["exportKind"]; durationMs: number } {
  if (template.mode === "legacy" && template.legacyTemplate) {
    return {
      template: template.legacyTemplate,
      design: emptyDesign(brand, template.legacyDesign),
      exportKind: template.exportKind ?? "jpg",
      durationMs: template.durationMs ?? 0,
    };
  }
  if (template.document) {
    const doc = cloneDocument(template.document);
    doc.canvas.backgroundColorId = doc.canvas.backgroundColorId || brand.defaultBackground;
    return {
      template: "document",
      design: documentToDesignState(doc, brand),
      document: doc,
      exportKind: template.document.metadata.exportKind ?? template.exportKind ?? "jpg",
      durationMs: template.document.metadata.durationMs ?? template.durationMs ?? 0,
    };
  }
  const doc = blankCanvasDocument(brand);
  return {
    template: "document",
    design: documentToDesignState(doc, brand),
    document: doc,
    exportKind: "jpg",
    durationMs: 0,
  };
}
