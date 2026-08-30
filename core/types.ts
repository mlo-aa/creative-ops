export type FormatPreset = {
  id: string;
  name: string;
  width: number;
  height: number;
};

export type BrandColor = {
  id: string;
  name: string;
  hex: string;
};

export type LogoRole =
  | "primary"
  | "wordmark"
  | "isotipo"
  | "horizontal"
  | "vertical"
  | "light"
  | "dark"
  | "secondary";

export type BrandLogo = {
  id: string;
  name: string;
  src: string;
  role: LogoRole;
};

export type BrandFonts = {
  primary: string;
  secondary: string;
  display: string;
  body: string;
  mono?: string;
};

export type BrandProfile = {
  name: string;
  shortName: string;
  description: string;
  tagline: string;
  website: string;
  colors: BrandColor[];
  logos: BrandLogo[];
  fonts: BrandFonts;
  defaultBackground: string;
  defaultText: string;
  defaultAccent: string;
};

export type AssetCategory =
  | "logos"
  | "photography"
  | "illustrations"
  | "icons"
  | "backgrounds"
  | "textures"
  | "ui"
  | "misc";

export type ProjectAsset = {
  id: string;
  name: string;
  src: string;
  category: AssetCategory;
  tags: string[];
};

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type LogoMode = "isotipo" | "wordmark";
export type StudioStatus = "active" | "draft";
export type PostKind = "single" | "carousel" | "reel";
export type ExportKind = "jpg" | "png" | "gif" | "mp4";

export type CopyField = "headline" | "supporting" | "eyebrow" | "cta" | "labels";
export type ColorField = "background" | "text" | "accent";

export type TemplateControls = {
  copy: CopyField[];
  colors: ColorField[];
  logo: boolean;
  mark: boolean;
  image: boolean;
  path: boolean;
  texture?: boolean;
  animation: boolean;
};

export type DesignState = {
  headline: string;
  supporting: string;
  eyebrow: string;
  cta: string;
  labels: string[];
  background: string;
  text: string;
  accent: string;
  showLogo: boolean;
  showMark: boolean;
  logoMode: LogoMode;
  logoColor: string;
  logoPosition: LogoPosition;
  logoX: number;
  logoY: number;
  imageSrc: string;
  imageObjectX: number;
  imageObjectY: number;
  imageZoom: number;
  imageGrayscale: boolean;
  overlayIntensity: number;
  overlayColor: string;
  imageOpacity: number;
  pathVisible: boolean;
  pathId: string;
  pathScale: number;
  pathX: number;
  pathY: number;
  pathColor: string;
  pathWidth: number;
  animationEnabled: boolean;
  animationSpeed: number;
  markScale: number;
  markX: number;
  markY: number;
  headlineX: number;
  headlineY: number;
  supportX: number;
  supportY: number;
  /** Optional campaign texture layer (Offer-Hub and future brands). */
  textureSrc: string;
  textureVisible: boolean;
  textureScale: number;
  textureX: number;
  textureY: number;
  textureOpacity: number;
  textureRotation: number;
  textureBlur: number;
};

export type CarouselSlide = {
  id: string;
  template: string;
  title: string;
  design: DesignState;
};

export type StudioPost = {
  id: string;
  baseId: string;
  number: string;
  title: string;
  exportKind: ExportKind;
  durationMs: number;
  status: StudioStatus;
  kind: PostKind;
  variantOf?: string;
  variantLabel?: string;
  /** Optional export filename middle segment, e.g. `01-brand` → `{prefix}-01-brand.jpg` */
  exportSlug?: string;
  template: string;
  design: DesignState;
  /** Structured design document — source of truth for document-mode posts */
  document?: DesignDocument;
  /** Structured video document — source of truth for reel/video posts */
  video?: VideoDocument;
  /** Posts referenced for AI generation / visual follow */
  referencePostIds?: string[];
  slides?: CarouselSlide[];
};

export type DesignDocument = import("@/core/design/document").DesignDocument;
export type VideoDocument = import("@/core/video/document").VideoDocument;

export type PostRenderProps = {
  design: DesignState;
  progress?: number;
  durationMs?: number;
  editing?: boolean;
  exporting?: boolean;
  onDesignChange?: (patch: Partial<DesignState>) => void;
};

export type ProjectGraphics = {
  paths: Record<string, string>;
};

export type ProjectConfig = {
  id: string;
  name: string;
  seeded?: boolean;
  createdAt: string;
  formatId: string;
  exportPrefix: string;
  /** Optional campaign label shown in the project chrome (e.g. active feed context). */
  campaign?: string;
  brand: BrandProfile;
  assets: ProjectAsset[];
  posts: StudioPost[];
  graphics?: ProjectGraphics;
};

export type PostPatch = {
  status?: StudioStatus;
  title?: string;
  design?: Partial<DesignState>;
  document?: DesignDocument;
  video?: VideoDocument;
  referencePostIds?: string[];
  slideOrder?: string[];
  extraSlides?: CarouselSlide[];
  removedSlideIds?: string[];
  slidePatches?: Record<string, { title?: string; design?: Partial<DesignState> }>;
};

export type ProjectOverlay = {
  name?: string;
  brand?: BrandProfile;
  assets?: ProjectAsset[];
  deletedAssetIds?: string[];
  formatId?: string;
  exportPrefix?: string;
  posts?: {
    order: string[];
    extras: StudioPost[];
    patches: Record<string, PostPatch>;
    deletedIds: string[];
    viewMode?: "feed" | "board";
  };
};

export type AppPersist = {
  version: 2;
  userProjects: ProjectConfig[];
  overlays: Record<string, ProjectOverlay>;
  ops: import("@/core/ops/types").OpsPersist;
};
