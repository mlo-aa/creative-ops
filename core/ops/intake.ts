/** Project intake, knowledge base, sources, references, and creative context. */

import type { ProjectType } from "@/core/ops/types";

export type OpsProjectStatus =
  | "draft"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export type ContextLevel = "basic" | "developing" | "rich";

export type IntakeProjectType = ProjectType | "landing_page" | "product" | "pitch_deck";

export type ProductStage =
  | "idea"
  | "pre_seed"
  | "mvp"
  | "beta"
  | "live"
  | "growth"
  | "established"
  | "custom";

export type FeatureStatus =
  | "concept"
  | "planned"
  | "in_development"
  | "live"
  | "deprecated";

export type ProductFeature = {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  importance: "low" | "medium" | "high";
};

export type BrandProductContext = {
  whatIsIt: string;
  problemSolved: string;
  whoIsItFor: string;
  primaryUsers: string[];
  currentStage: ProductStage | string;
  customStage: string;
  features: ProductFeature[];
  differentiators: string[];
  technology: string[];
  currentPositioning: string;
  currentSlogan: string;
  previousBrand: string;
};

export type SourceType =
  | "website"
  | "landing_page"
  | "social_profile"
  | "figma"
  | "github"
  | "notion"
  | "google_drive"
  | "other_url"
  | "file"
  | "notes";

export type SourceCategory =
  | "brandbook"
  | "landing_page"
  | "website"
  | "product"
  | "strategy"
  | "research"
  | "pitch_deck"
  | "content_plan"
  | "campaign"
  | "competitor"
  | "inspiration"
  | "technical"
  | "customer_research"
  | "interview"
  | "legal"
  | "previous_version"
  | "other";

export type SourcePriority = "primary" | "important" | "reference" | "archive";
export type SourceStatus = "current" | "superseded" | "archived";

export type ProjectSource = {
  id: string;
  projectId: string;
  title: string;
  sourceType: SourceType;
  category: SourceCategory;
  url: string;
  fileData: string;
  fileName: string;
  fileMime: string;
  content: string;
  description: string;
  tags: string[];
  priority: SourcePriority;
  status: SourceStatus;
  isSourceOfTruth: boolean;
  supersededBy: string;
  extractedText: string;
  notes: string;
  relatedDecisionIds: string[];
  relatedContentIds: string[];
  relatedDeliverableIds: string[];
  dateAdded: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeNotes = {
  projectId: string;
  confirmedFacts: string;
  openQuestions: string;
  assumptions: string;
  decisions: string;
  avoidDoNotUse: string;
  terminology: string;
  updatedAt: string;
};

export type DecisionArea =
  | "brand"
  | "product"
  | "strategy"
  | "content"
  | "design"
  | "technology"
  | "campaign"
  | "other";

export type DecisionStatus = "current" | "superseded" | "archived";

export type ProjectDecision = {
  id: string;
  projectId: string;
  decision: string;
  rationale: string;
  date: string;
  status: DecisionStatus;
  area: DecisionArea;
  sourceId: string;
  person: string;
  supersededBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ReferenceCategory =
  | "competitor"
  | "benchmark"
  | "visual"
  | "product"
  | "campaign"
  | "website"
  | "social_feed"
  | "motion"
  | "copy"
  | "brand";

export type ProjectReference = {
  id: string;
  projectId: string;
  boardId: string;
  title: string;
  url: string;
  imageSrc: string;
  category: ReferenceCategory;
  whatWeLike: string;
  whatNotToCopy: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ReferenceBoard = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
};

export type LogoStatus = "existing" | "being_refined" | "pending" | "not_needed";
export type SloganStatus = "existing" | "exploring" | "pending" | "not_needed";

export type CreativeDirection = {
  projectId: string;
  brandPersonality: string[];
  brandPersonalityNotes: string;
  desiredFeeling: string;
  visualDirection: string;
  voiceAndTone: string;
  wordsToUse: string;
  wordsToAvoid: string;
  visualMotifs: string;
  visualStylesToAvoid: string;
  photographyDirection: string;
  motionDirection: string;
  uiDirection: string;
  typographyDirection: string;
  colorDirection: string;
  logoStatus: LogoStatus;
  sloganStatus: SloganStatus;
  updatedAt: string;
};

export type LandingPageStatus = "planning" | "design" | "development" | "live";

export type WebLandingContext = {
  existingWebsite: string;
  existingLandingPage: string;
  repositoryUrl: string;
  deploymentUrl: string;
  framework: string;
  mainSections: { id: string; name: string }[];
  primaryCta: string;
  secondaryCta: string;
  currentCopy: string;
  pageStatus: LandingPageStatus;
  screenshots: { id: string; src: string; caption: string }[];
  notes: string;
  relatedSourceIds: string[];
  relatedDeliverableIds: string[];
};

export type SocialAccount = {
  id: string;
  platform: string;
  handle: string;
  url: string;
  status: string;
  notes: string;
};

export type SocialContext = {
  accounts: SocialAccount[];
  feedScreenshots: { id: string; src: string; caption: string }[];
  feedReferences: string;
  contentPillars: string;
  postingCadence: string;
  campaignPlan: string;
};

export type CompetitorBenchmark = {
  id: string;
  projectId: string;
  name: string;
  website: string;
  socialLinks: string;
  category: string;
  whyRelevant: string;
  strengths: string;
  weaknesses: string;
  visualNotes: string;
  messagingNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type MoodboardItem = {
  id: string;
  src: string;
  url: string;
  caption: string;
  type: "image" | "link" | "color" | "typography";
  notes: string;
  sectionId: string;
};

export type MoodboardSection = {
  id: string;
  name: string;
  items: MoodboardItem[];
};

export type ProjectIntake = {
  projectId: string;
  brandProduct: BrandProductContext;
  creativeDirection: CreativeDirection;
  webLanding: WebLandingContext;
  social: SocialContext;
  channels: string[];
  expectedDeliverables: string[];
  intakeStep: number;
  intakeDraft: boolean;
  intakeCompleted?: boolean;
  updatedAt: string;
};

export type ExtendedStrategyFields = {
  projectObjective: string;
  businessObjective: string;
  communicationObjective: string;
  audience: string;
  userProblem: string;
  proofPoints: string;
  constraints: string;
  successCriteria: string;
};

export const INTAKE_STEPS = [
  "Basics",
  "Brand / Product",
  "Sources",
  "References",
  "Strategy",
  "Creative Direction",
  "Channels / Deliverables",
  "Review",
] as const;

export const CHANNEL_OPTIONS = [
  "Instagram",
  "LinkedIn",
  "X",
  "Website",
  "Landing page",
  "Email",
  "Newsletter",
  "Discord",
  "Telegram",
  "YouTube",
  "TikTok",
  "Events",
  "Print",
  "Other",
];

export const DELIVERABLE_OPTIONS = [
  "Logo",
  "Brandbook",
  "Landing page",
  "Instagram feed",
  "Social campaign",
  "Pitch deck",
  "Video",
  "Reel",
  "GIF",
  "Carousel",
  "Report",
  "Documentation",
  "Product UI",
  "Website",
  "Motion",
  "Other",
];

export function emptyBrandProduct(): BrandProductContext {
  return {
    whatIsIt: "",
    problemSolved: "",
    whoIsItFor: "",
    primaryUsers: [],
    currentStage: "idea",
    customStage: "",
    features: [],
    differentiators: [],
    technology: [],
    currentPositioning: "",
    currentSlogan: "",
    previousBrand: "",
  };
}

export function emptyCreativeDirection(projectId: string): CreativeDirection {
  return {
    projectId,
    brandPersonality: [],
    brandPersonalityNotes: "",
    desiredFeeling: "",
    visualDirection: "",
    voiceAndTone: "",
    wordsToUse: "",
    wordsToAvoid: "",
    visualMotifs: "",
    visualStylesToAvoid: "",
    photographyDirection: "",
    motionDirection: "",
    uiDirection: "",
    typographyDirection: "",
    colorDirection: "",
    logoStatus: "pending",
    sloganStatus: "pending",
    updatedAt: new Date().toISOString(),
  };
}

export function emptyWebLanding(): WebLandingContext {
  return {
    existingWebsite: "",
    existingLandingPage: "",
    repositoryUrl: "",
    deploymentUrl: "",
    framework: "",
    mainSections: [],
    primaryCta: "",
    secondaryCta: "",
    currentCopy: "",
    pageStatus: "planning",
    screenshots: [],
    notes: "",
    relatedSourceIds: [],
    relatedDeliverableIds: [],
  };
}

export function emptySocialContext(): SocialContext {
  return {
    accounts: [],
    feedScreenshots: [],
    feedReferences: "",
    contentPillars: "",
    postingCadence: "",
    campaignPlan: "",
  };
}

export function emptyKnowledge(projectId: string): KnowledgeNotes {
  return {
    projectId,
    confirmedFacts: "",
    openQuestions: "",
    assumptions: "",
    decisions: "",
    avoidDoNotUse: "",
    terminology: "",
    updatedAt: new Date().toISOString(),
  };
}

export function emptyIntake(projectId: string): ProjectIntake {
  return {
    projectId,
    brandProduct: emptyBrandProduct(),
    creativeDirection: emptyCreativeDirection(projectId),
    webLanding: emptyWebLanding(),
    social: emptySocialContext(),
    channels: [],
    expectedDeliverables: [],
    intakeStep: 0,
    intakeDraft: true,
    intakeCompleted: false,
    updatedAt: new Date().toISOString(),
  };
}

export function emptyExtendedStrategy(): ExtendedStrategyFields {
  return {
    projectObjective: "",
    businessObjective: "",
    communicationObjective: "",
    audience: "",
    userProblem: "",
    proofPoints: "",
    constraints: "",
    successCriteria: "",
  };
}
