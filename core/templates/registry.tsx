"use client";

import {
  Announcement,
  BigStatement,
  BrandCta,
  BrandIntro,
  CarouselCover,
  Editorial,
  Manifesto,
  Metric,
  PhotoHeadline,
  Principles,
  Problem,
  ProcessSteps,
  ProductValue,
  Quote,
  TeamIntro,
  TEMPLATE_ALIASES,
  TEMPLATE_CONTROLS,
} from "@/core/templates/coreTemplates";
import { DocumentRenderer } from "@/core/design/render/DocumentRenderer";
import { hexOf } from "@/core/color";
import { SendaProductValue } from "@/projects/senda/templates";
import {
  OhBrandIntro,
  OhCompare,
  OhCta,
  OhEditorial,
  OhEcosystem,
  OhEscrow,
  OhPayments,
  OhProduct,
  OhReputation,
  OFFERHUB_TEMPLATE_CONTROLS,
} from "@/projects/offerhub/templates";
import type { PostRenderProps, StudioPost } from "@/core/types";
import type { ComponentType } from "react";

const CORE: Record<string, ComponentType<PostRenderProps>> = {
  "brand-intro": BrandIntro,
  "brand-idea": BigStatement,
  problem: Problem,
  "how-it-works": ProcessSteps,
  follow: PhotoHeadline,
  "product-value": ProductValue,
  "brand-cta": BrandCta,
  quote: Quote,
  announcement: Announcement,
  metric: Metric,
  "who-intro": CarouselCover,
  "who-why": Editorial,
  "who-believe": Principles,
  "who-team": TeamIntro,
  "who-close": Manifesto,
};

const PROJECT_TEMPLATES: Record<string, Record<string, ComponentType<PostRenderProps>>> = {
  senda: {
    "product-value": SendaProductValue,
  },
  offerhub: {
    "oh-brand-intro": OhBrandIntro,
    "oh-compare": OhCompare,
    "oh-payments": OhPayments,
    "oh-escrow": OhEscrow,
    "oh-editorial": OhEditorial,
    "oh-ecosystem": OhEcosystem,
    "oh-cta": OhCta,
    "oh-product": OhProduct,
    "oh-reputation": OhReputation,
  },
};

export function resolveTemplate(projectId: string, templateId: string) {
  const id = TEMPLATE_ALIASES[templateId] ?? templateId;
  return PROJECT_TEMPLATES[projectId]?.[id] ?? CORE[id] ?? BrandIntro;
}

export function templateControls(templateId: string) {
  const id = TEMPLATE_ALIASES[templateId] ?? templateId;
  return (
    OFFERHUB_TEMPLATE_CONTROLS[id] ??
    TEMPLATE_CONTROLS[id] ??
    TEMPLATE_CONTROLS["brand-intro"]
  );
}

export function PostArt({
  post,
  projectId,
  slideId,
  progress,
  editing,
  exporting,
  onDesignChange,
  onDocumentChange,
}: {
  post: StudioPost;
  projectId: string;
  slideId?: string;
  progress?: number;
  editing?: boolean;
  exporting?: boolean;
  onDesignChange?: PostRenderProps["onDesignChange"];
  onDocumentChange?: (document: import("@/core/types").DesignDocument) => void;
}) {
  const slides = post.slides ?? [];
  const slide =
    post.kind === "carousel"
      ? (slides.find((item) => item.id === slideId) ?? slides[0])
      : null;
  const template = slide?.template ?? post.template;
  const design = slide?.design ?? post.design;
  const document = post.document;

  if (template === "document" && document) {
    return (
      <DocumentRenderer
        document={document}
        design={design}
        progress={progress}
        editing={editing}
        onDocumentChange={onDocumentChange}
        onDesignChange={onDesignChange}
      />
    );
  }

  const Component = resolveTemplate(projectId, template);
  return (
    <Component
      design={design}
      progress={progress}
      durationMs={post.durationMs}
      editing={editing}
      exporting={exporting}
      onDesignChange={onDesignChange}
    />
  );
}

export function canvasBackground(post: StudioPost, brandHex: (id: string) => string, slideId?: string) {
  if (post.template === "document" && post.document) {
    return brandHex(post.document.canvas.backgroundColorId);
  }
  const design =
    post.kind === "carousel"
      ? (post.slides?.find((slide) => slide.id === slideId) ?? post.slides?.[0])?.design ??
        post.design
      : post.design;
  return brandHex(design.background);
}

export { hexOf };
