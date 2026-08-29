import { emptyDesign } from "@/core/design";
import type { ExportKind, BrandProfile, DesignState } from "@/core/types";
import type { ProjectCreativeContext } from "@/core/design/creativeContext";
import type { DesignDocument, DesignTemplate } from "@/core/design/document";
import {
  blankCanvasDocument,
  cloneDocument,
  imageElement,
  logoElement,
  rectangleElement,
  textElement,
  textureElement,
  uid,
} from "@/core/design/document";

export type CreativeFreedom = "low" | "medium" | "high";
export type DesignOutputKind = "static" | "animated" | "carousel";

export type GenerateDesignBrief = {
  brief: string;
  platform: string;
  format: string;
  campaignId?: string;
  outputKind: DesignOutputKind;
  creativeFreedom: CreativeFreedom;
  referencePostIds?: string[];
  inspirationIds?: string[];
  title?: string;
};

export type VariationMode =
  | "same_content_new_layout"
  | "same_layout_new_content"
  | "color_variation"
  | "more_experimental";

export type GenerateDesignResult = {
  document: DesignDocument;
  title: string;
  exportKind: ExportKind;
  durationMs: number;
  template: string;
  design: import("@/core/types").DesignState;
};

export interface DesignGenerationProvider {
  generateDesign(
    brief: GenerateDesignBrief,
    context: ProjectCreativeContext,
    references: DesignDocument[],
  ): Promise<GenerateDesignResult>;

  generateVariation(
    source: DesignDocument,
    mode: VariationMode,
    context: ProjectCreativeContext,
  ): Promise<DesignDocument>;
}

function pickHeadline(brief: GenerateDesignBrief, context: ProjectCreativeContext): string {
  const words = brief.brief.trim().split(/\s+/).slice(0, 6);
  if (words.length >= 3) return words.join(" ").toUpperCase();
  if (context.strategy.keyMessages) return context.strategy.keyMessages.split(".")[0]?.trim().toUpperCase() ?? "NEW POST";
  return context.brand.name.toUpperCase();
}

function pickSupporting(brief: GenerateDesignBrief, context: ProjectCreativeContext): string {
  if (brief.brief.length > 20) return brief.brief.slice(0, 180);
  return context.strategy.valueProposition || context.brand.description || context.brand.tagline;
}

function brandFromContext(context: ProjectCreativeContext): BrandProfile {
  return {
    name: context.brand.name,
    shortName: context.brand.name,
    description: context.brand.description,
    tagline: context.brand.tagline,
    website: "",
    colors: context.brand.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex })),
    logos: context.brand.logos.map((l) => ({
      id: l.id,
      name: l.name,
      src: l.src,
      role: l.role as BrandProfile["logos"][number]["role"],
    })),
    fonts: context.brand.fonts as BrandProfile["fonts"],
    defaultBackground: context.brand.defaultBackground,
    defaultText: context.brand.defaultText,
    defaultAccent: context.brand.defaultAccent,
  };
}

function editorialLayout(
  context: ProjectCreativeContext,
  brief: GenerateDesignBrief,
  freedom: CreativeFreedom,
): DesignDocument {
  const brand = brandFromContext(context);
  const bg = brand.defaultBackground;
  const text = brand.defaultText;
  const accent = brand.defaultAccent;
  const doc = blankCanvasDocument(brand);

  const headlineSize = freedom === "high" ? 96 : freedom === "medium" ? 80 : 64;
  const photoAsset = context.assets.find((a) => a.category === "photography" || a.category === "backgrounds");

  doc.elements = [
    rectangleElement({ zIndex: 0, props: { fillColorId: bg } }, brand),
    ...(context.projectId === "offerhub"
      ? [
          textureElement({
            zIndex: 1,
            props: {
              src: "/projects/offerhub/textures/gradient.png",
              scale: freedom === "high" ? 1.4 : 1.2,
              opacity: 0.85,
              rotation: freedom === "high" ? -22 : -14,
              blur: 0,
            },
          }),
        ]
      : []),
    ...(photoAsset && freedom !== "low"
      ? [
          imageElement(
            {
              zIndex: 2,
              y: 520,
              height: 620,
              props: {
                src: photoAsset.src,
                assetId: photoAsset.id,
                overlayColorId: bg,
                overlayOpacity: freedom === "high" ? 0.55 : 0.35,
              },
            },
            brand,
          ),
        ]
      : []),
    logoElement({ zIndex: 20, x: 80, y: 72, width: 140, height: 56 }, brand),
    textElement(
      {
        zIndex: 15,
        y: freedom === "high" ? 180 : 220,
        height: 280,
        name: "Headline",
        props: {
          content: pickHeadline(brief, context),
          fontSize: headlineSize,
          fontWeight: 700,
          colorId: text,
          lineHeight: 0.95,
          uppercase: true,
        },
      },
      brand,
    ),
    textElement(
      {
        name: "Supporting",
        zIndex: 16,
        y: freedom === "high" ? 420 : 480,
        height: 160,
        props: {
          content: pickSupporting(brief, context),
          fontRole: "body",
          fontSize: 22,
          fontWeight: 400,
          colorId: text,
          lineHeight: 1.35,
        },
      },
      brand,
    ),
    textElement(
      {
        name: "Eyebrow",
        zIndex: 14,
        y: 140,
        height: 40,
        props: {
          content: brief.platform.toUpperCase(),
          fontSize: 14,
          fontWeight: 500,
          colorId: accent,
          letterSpacing: "0.18em",
          uppercase: true,
        },
      },
      brand,
    ),
  ];

  doc.metadata = {
    brief: brief.brief,
    platform: brief.platform,
    format: brief.format,
    campaignId: brief.campaignId,
    generatedBy: "ai",
    referencePostIds: brief.referencePostIds,
    inspirationIds: brief.inspirationIds,
    creativeFreedom: brief.creativeFreedom,
    exportKind: brief.outputKind === "animated" ? "gif" : "jpg",
    durationMs: brief.outputKind === "animated" ? 5500 : 0,
  };

  return doc;
}

/** Sync minimal DesignState from document for legacy editor/export compatibility. */
export function documentToDesignState(doc: DesignDocument, brand: BrandProfile): DesignState {
  const headline = doc.elements.find((e) => e.type === "text" && (e.name === "Headline" || e.name === "Text"));
  const supporting = doc.elements.find((e) => e.name === "Supporting");
  const eyebrow = doc.elements.find((e) => e.name === "Eyebrow");
  const texture = doc.elements.find((e) => e.type === "texture");
  const image = doc.elements.find((e) => e.type === "image");

  const hProps = headline?.props as import("@/core/design/document").TextPrimitiveProps | undefined;
  const sProps = supporting?.props as import("@/core/design/document").TextPrimitiveProps | undefined;
  const eProps = eyebrow?.props as import("@/core/design/document").TextPrimitiveProps | undefined;
  const tProps = texture?.props as import("@/core/design/document").TexturePrimitiveProps | undefined;
  const iProps = image?.props as import("@/core/design/document").ImagePrimitiveProps | undefined;

  return emptyDesign(brand, {
    background: doc.canvas.backgroundColorId,
    text: hProps?.colorId ?? brand.defaultText,
    accent: brand.defaultAccent,
    headline: hProps?.content ?? "",
    supporting: sProps?.content ?? "",
    eyebrow: eProps?.content ?? "",
    headlineX: (headline?.x ?? 80) - 80,
    headlineY: (headline?.y ?? 200) - 200,
    supportX: (supporting?.x ?? 80) - 80,
    supportY: (supporting?.y ?? 480) - 480,
    showLogo: doc.elements.some((e) => e.type === "logo"),
    imageSrc: iProps?.src ?? "",
    textureSrc: tProps?.src ?? "",
    textureVisible: Boolean(texture?.visible),
    textureScale: tProps?.scale ?? 1,
    textureOpacity: tProps?.opacity ?? 1,
    textureRotation: tProps?.rotation ?? 0,
    animationEnabled: doc.metadata.exportKind === "gif",
    animationSpeed: 1,
  });
}

export class MockDesignGenerationProvider implements DesignGenerationProvider {
  async generateDesign(
    brief: GenerateDesignBrief,
    context: ProjectCreativeContext,
    references: DesignDocument[],
  ): Promise<GenerateDesignResult> {
    void references;
    const doc = editorialLayout(context, brief, brief.creativeFreedom);
    const brandProfile = brandFromContext(context);
    const design = documentToDesignState(doc, brandProfile);
    const title = brief.title || pickHeadline(brief, context).slice(0, 48);

    return {
      document: doc,
      title,
      exportKind: doc.metadata.exportKind ?? "jpg",
      durationMs: doc.metadata.durationMs ?? 0,
      template: "document",
      design,
    };
  }

  async generateVariation(
    source: DesignDocument,
    mode: VariationMode,
    context: ProjectCreativeContext,
  ): Promise<DesignDocument> {
    const doc = cloneDocument(source);
    doc.metadata = { ...doc.metadata, generatedBy: "variation" };

    if (mode === "same_content_new_layout") {
      for (const el of doc.elements) {
        if (el.type === "text" && el.name !== "Eyebrow") {
          el.x = el.x + (Math.random() > 0.5 ? 40 : -20);
          el.y = el.y + (Math.random() > 0.5 ? 60 : -30);
        }
      }
    } else if (mode === "same_layout_new_content") {
      const brief: GenerateDesignBrief = {
        brief: context.strategy.valueProposition || context.brand.tagline,
        platform: doc.metadata.platform ?? "instagram",
        format: doc.metadata.format ?? "post",
        outputKind: doc.metadata.exportKind === "gif" ? "animated" : "static",
        creativeFreedom: "medium",
      };
      const fresh = editorialLayout(context, brief, "medium");
      for (const el of doc.elements) {
        if (el.type !== "text") continue;
        const match = fresh.elements.find((f) => f.name === el.name || f.type === el.type);
        if (match && match.type === "text") {
          (el.props as import("@/core/design/document").TextPrimitiveProps).content = (
            match.props as import("@/core/design/document").TextPrimitiveProps
          ).content;
        }
      }
    } else if (mode === "color_variation") {
      const colors = context.approvedColorIds;
      const swap = colors[(colors.indexOf(doc.canvas.backgroundColorId) + 1) % colors.length];
      doc.canvas.backgroundColorId = swap;
      for (const el of doc.elements) {
        if (el.type === "rectangle") {
          (el.props as import("@/core/design/document").ShapePrimitiveProps).fillColorId = swap;
        }
      }
    } else if (mode === "more_experimental") {
      for (const el of doc.elements) {
        if (el.type === "text") {
          (el.props as import("@/core/design/document").TextPrimitiveProps).fontSize *= 1.15;
          el.rotation = (el.rotation ?? 0) + (Math.random() > 0.5 ? 2 : -2);
        }
      }
      const tex = doc.elements.find((e) => e.type === "texture");
      if (tex) {
        (tex.props as import("@/core/design/document").TexturePrimitiveProps).scale *= 1.2;
        (tex.props as import("@/core/design/document").TexturePrimitiveProps).rotation -= 8;
      }
    }

    return doc;
  }
}

export const designGenerationProvider = new MockDesignGenerationProvider();

export function documentFromTemplate(template: DesignTemplate): DesignDocument {
  if (template.mode === "document" && template.document) {
    return cloneDocument(template.document);
  }
  throw new Error("Legacy templates use legacyTemplate path");
}
