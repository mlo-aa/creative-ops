/** Structured design document — source of truth for editable layouts. */

import type { BrandProfile, DesignState, ExportKind } from "@/core/types";

export type PrimitiveType =
  | "text"
  | "image"
  | "logo"
  | "svg"
  | "rectangle"
  | "circle"
  | "line"
  | "texture"
  | "ui_screenshot"
  | "group";

export type TextAlign = "left" | "center" | "right";
export type FontRole = "display" | "body" | "primary" | "secondary";

export type ElementAnimation = {
  enabled: boolean;
  speed: number;
  type: "fade" | "slide" | "scale" | "none";
  delayMs: number;
};

export type TextPrimitiveProps = {
  content: string;
  fontRole: FontRole;
  fontSize: number;
  fontWeight: number | string;
  lineHeight: number;
  letterSpacing: string;
  colorId: string;
  align: TextAlign;
  uppercase: boolean;
};

export type ImagePrimitiveProps = {
  src: string;
  assetId?: string;
  objectFit: "cover" | "contain";
  objectX: number;
  objectY: number;
  grayscale: boolean;
  overlayColorId: string;
  overlayOpacity: number;
};

export type LogoPrimitiveProps = {
  logoId: string;
  mode: "isotipo" | "wordmark" | "primary";
  colorId: string;
};

export type ShapePrimitiveProps = {
  fillColorId: string;
  strokeColorId: string;
  strokeWidth: number;
  cornerRadius: number;
};

export type TexturePrimitiveProps = {
  src: string;
  assetId?: string;
  scale: number;
  opacity: number;
  rotation: number;
  blur: number;
};

export type LinePrimitiveProps = {
  strokeColorId: string;
  strokeWidth: number;
  x2: number;
  y2: number;
};

export type SvgPrimitiveProps = {
  pathId: string;
  pathData: string;
  strokeColorId: string;
  strokeWidth: number;
  fillColorId: string;
};

export type UiScreenshotPrimitiveProps = {
  src: string;
  assetId?: string;
  borderRadius: number;
};

export type GroupPrimitiveProps = {
  childIds: string[];
};

export type PrimitiveProps =
  | TextPrimitiveProps
  | ImagePrimitiveProps
  | LogoPrimitiveProps
  | ShapePrimitiveProps
  | TexturePrimitiveProps
  | LinePrimitiveProps
  | SvgPrimitiveProps
  | UiScreenshotPrimitiveProps
  | GroupPrimitiveProps;

export type DesignElement = {
  id: string;
  type: PrimitiveType;
  name: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  props: PrimitiveProps;
  animation?: ElementAnimation;
};

export type DesignCanvas = {
  width: number;
  height: number;
  backgroundColorId: string;
};

export type DesignDocumentMetadata = {
  brief?: string;
  platform?: string;
  format?: string;
  campaignId?: string;
  generatedBy?: "manual" | "ai" | "template" | "variation";
  templateId?: string;
  referencePostIds?: string[];
  inspirationIds?: string[];
  creativeFreedom?: "low" | "medium" | "high";
  exportKind?: ExportKind;
  durationMs?: number;
};

export type DesignDocument = {
  version: 1;
  schemaVersion: 1;
  canvas: DesignCanvas;
  elements: DesignElement[];
  metadata: DesignDocumentMetadata;
};

export type TemplateMode = "document" | "legacy";

export type DesignTemplate = {
  id: string;
  name: string;
  description: string;
  projectId?: string;
  sourcePostId?: string;
  tags: string[];
  mode: TemplateMode;
  /** Document-based template */
  document?: DesignDocument;
  /** Legacy React template reference */
  legacyTemplate?: string;
  legacyDesign?: Partial<DesignState>;
  exportKind?: ExportKind;
  durationMs?: number;
  createdAt: string;
};

export function uid(prefix = "el") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyDocument(
  brand: BrandProfile,
  partial?: Partial<DesignDocument>,
): DesignDocument {
  return {
    version: 1,
    schemaVersion: 1,
    canvas: {
      width: 1080,
      height: 1440,
      backgroundColorId: brand.defaultBackground,
    },
    elements: [],
    metadata: {},
    ...partial,
  };
}

export function blankCanvasDocument(brand: BrandProfile): DesignDocument {
  return emptyDocument(brand, {
    metadata: { generatedBy: "manual", brief: "Blank canvas" },
  });
}

export function cloneDocument(doc: DesignDocument): DesignDocument {
  const cloned = structuredClone(doc);
  if (!cloned.schemaVersion) cloned.schemaVersion = 1;
  return cloned;
}

export function sortElements(elements: DesignElement[]): DesignElement[] {
  return [...elements].sort((a, b) => a.zIndex - b.zIndex);
}

export function textElement(
  partial: Partial<Omit<DesignElement, "props">> & { props?: Partial<TextPrimitiveProps> },
  brand: BrandProfile,
): DesignElement {
  return {
    id: partial.id ?? uid("text"),
    type: "text",
    name: partial.name ?? "Text",
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    x: partial.x ?? 80,
    y: partial.y ?? 200,
    width: partial.width ?? 920,
    height: partial.height ?? 200,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    zIndex: partial.zIndex ?? 10,
    animation: partial.animation,
    props: {
      content: "",
      fontRole: "display",
      fontSize: 72,
      fontWeight: 600,
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
      colorId: brand.defaultText,
      align: "left",
      uppercase: false,
      ...partial.props,
    },
  };
}

export function logoElement(
  partial: Partial<Omit<DesignElement, "props">> & { props?: Partial<LogoPrimitiveProps> },
  brand: BrandProfile,
): DesignElement {
  return {
    id: partial.id ?? uid("logo"),
    type: "logo",
    name: partial.name ?? "Logo",
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    x: partial.x ?? 80,
    y: partial.y ?? 80,
    width: partial.width ?? 120,
    height: partial.height ?? 48,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    zIndex: partial.zIndex ?? 20,
    props: {
      logoId: brand.logos[0]?.id ?? "primary",
      mode: "isotipo",
      colorId: brand.defaultText,
      ...partial.props,
    },
  };
}

export function rectangleElement(
  partial: Partial<Omit<DesignElement, "props">> & { props?: Partial<ShapePrimitiveProps> },
  brand: BrandProfile,
): DesignElement {
  return {
    id: partial.id ?? uid("rect"),
    type: "rectangle",
    name: partial.name ?? "Rectangle",
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 1080,
    height: partial.height ?? 1440,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    zIndex: partial.zIndex ?? 0,
    props: {
      fillColorId: brand.defaultBackground,
      strokeColorId: brand.defaultAccent,
      strokeWidth: 0,
      cornerRadius: 0,
      ...partial.props,
    },
  };
}

export function textureElement(
  partial: Partial<Omit<DesignElement, "props">> & { props?: Partial<TexturePrimitiveProps> },
): DesignElement {
  return {
    id: partial.id ?? uid("tex"),
    type: "texture",
    name: partial.name ?? "Texture",
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 1080,
    height: partial.height ?? 1440,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    zIndex: partial.zIndex ?? 1,
    props: {
      src: "",
      scale: 1,
      opacity: 0.9,
      rotation: 0,
      blur: 0,
      ...partial.props,
    },
  };
}

export function imageElement(
  partial: Partial<Omit<DesignElement, "props">> & { props?: Partial<ImagePrimitiveProps> },
  brand: BrandProfile,
): DesignElement {
  return {
    id: partial.id ?? uid("img"),
    type: "image",
    name: partial.name ?? "Image",
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    x: partial.x ?? 0,
    y: partial.y ?? 400,
    width: partial.width ?? 1080,
    height: partial.height ?? 700,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    zIndex: partial.zIndex ?? 5,
    props: {
      src: "",
      objectFit: "cover",
      objectX: 50,
      objectY: 50,
      grayscale: false,
      overlayColorId: brand.defaultBackground,
      overlayOpacity: 0.4,
      ...partial.props,
    },
  };
}
