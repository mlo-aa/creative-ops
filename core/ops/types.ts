/** Creative Operations entities — linked to Studio projects via `projectId`. */

export type ProjectType =
  | "social"
  | "branding"
  | "campaign"
  | "website"
  | "landing_page"
  | "product"
  | "strategy"
  | "content"
  | "launch"
  | "pitch_deck"
  | "event"
  | "internal"
  | "other";

export type OpsProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";

export type OpsProject = {
  id: string;
  code: string;
  name: string;
  clientId?: string;
  clientName: string;
  /** Primary type (backwards compatible) */
  type: ProjectType;
  /** Multiple project types */
  types: ProjectType[];
  status: OpsProjectStatus;
  color: string;
  startDate?: string;
  deadline?: string;
  description?: string;
  owner?: string;
  contextLevel?: "basic" | "developing" | "rich";
  intakeStep?: number;
  intakeCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClientStatus = "lead" | "active" | "past" | "internal";

export type Client = {
  id: string;
  name: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  notes: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "negotiation"
  | "accepted"
  | "rejected"
  | "expired";

export type Proposal = {
  id: string;
  title: string;
  clientId?: string;
  clientName: string;
  projectType: ProjectType;
  value: number;
  currency: string;
  date: string;
  status: ProposalStatus;
  notes: string;
  externalLink: string;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type IdeaStatus = "idea" | "exploring" | "approved" | "discarded";

export type ProjectIdea = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  category: string;
  status: IdeaStatus;
  tags: string[];
  onGlobalMap: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectStrategy = {
  projectId: string;
  targetAudience: string;
  valueProposition: string;
  channels: string;
  keyMessages: string;
  kpis: string;
  campaignTimeline: string;
  problem: string;
  objective: string;
  positioning: string;
  competitors: string;
  risks: string;
  notes: string;
  projectObjective: string;
  businessObjective: string;
  communicationObjective: string;
  audience: string;
  userProblem: string;
  proofPoints: string;
  constraints: string;
  successCriteria: string;
  updatedAt: string;
};

export type LinkType =
  | "reference"
  | "brief"
  | "inspiration"
  | "tool"
  | "research"
  | "client"
  | "asset"
  | "other";

export type ProjectLink = {
  id: string;
  projectId: string;
  title: string;
  url: string;
  type: LinkType;
  description: string;
  createdAt: string;
};

export type PhaseType =
  | "briefing"
  | "research"
  | "strategy"
  | "concept"
  | "design"
  | "production"
  | "review"
  | "launch"
  | "reporting"
  | "custom";

export type PhaseStatus = "pending" | "active" | "review" | "completed" | "blocked";

export type ProjectPhase = {
  id: string;
  projectId: string;
  name: string;
  type: PhaseType;
  startDate?: string;
  endDate?: string;
  status: PhaseStatus;
  notes: string;
  createdAt: string;
};

export type DeliverableType =
  | "logo"
  | "brandbook"
  | "landing"
  | "post"
  | "carousel"
  | "gif"
  | "video"
  | "campaign"
  | "presentation"
  | "document"
  | "report"
  | "website"
  | "other";

export type DeliverableStatus = "pending" | "in_progress" | "review" | "approved" | "delivered";

export type Deliverable = {
  id: string;
  projectId: string;
  name: string;
  type: DeliverableType;
  status: DeliverableStatus;
  deadline?: string;
  notes: string;
  phaseId?: string;
  link?: string;
  relatedPostId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentPlatform =
  | "instagram"
  | "linkedin"
  | "x"
  | "tiktok"
  | "youtube"
  | "telegram"
  | "discord"
  | "newsletter"
  | "blog"
  | "other";

export type ContentFormat =
  | "post"
  | "carousel"
  | "reel"
  | "story"
  | "thread"
  | "article"
  | "video"
  | "announcement"
  | "other";

export type ContentStatus =
  | "idea"
  | "draft"
  | "design"
  | "review"
  | "scheduled"
  | "published"
  | "archived";

export type ContentItem = {
  id: string;
  projectId: string;
  campaignId?: string;
  title: string;
  platform: ContentPlatform;
  format: ContentFormat;
  publicationDate?: string;
  status: ContentStatus;
  caption: string;
  hashtags: string;
  relatedPostId?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignStatus = "planning" | "active" | "paused" | "completed";

export type Campaign = {
  id: string;
  projectId: string;
  name: string;
  objective: string;
  startDate?: string;
  endDate?: string;
  status: CampaignStatus;
  kpis: string;
  createdAt: string;
};

export type BrandExtension = {
  projectId: string;
  voiceTone: string;
  keywords: string[];
  typographyNotes: string;
  moodboard: { id: string; src: string; caption: string; url?: string; type?: string; notes?: string; sectionId?: string }[];
  moodboardSections: { id: string; name: string; items: { id: string; src: string; caption: string; url?: string; type?: string; notes?: string }[] }[];
  colorDescriptions: Record<string, string>;
  updatedAt: string;
};

export type InspirationCategory =
  | "typography"
  | "color"
  | "layout"
  | "copy"
  | "campaign"
  | "photography"
  | "motion"
  | "brand"
  | "website"
  | "other";

export type Inspiration = {
  id: string;
  title: string;
  url: string;
  imageSrc: string;
  category: InspirationCategory;
  tags: string[];
  notes: string;
  projectIds: string[];
  createdAt: string;
};

export type IdeaNodeType =
  | "idea"
  | "concept"
  | "reference"
  | "campaign"
  | "message"
  | "audience"
  | "problem"
  | "opportunity"
  | "content"
  | "custom";

export type IdeaNode = {
  id: string;
  type: IdeaNodeType;
  label: string;
  projectId?: string;
  x: number;
  y: number;
};

export type IdeaEdge = {
  id: string;
  source: string;
  target: string;
};

export type CalendarEventType =
  | "content"
  | "deliverable"
  | "phase"
  | "campaign"
  | "meeting"
  | "launch"
  | "milestone"
  | "custom";

export type CalendarEvent = {
  id: string;
  projectId?: string;
  title: string;
  type: CalendarEventType;
  date: string;
  endDate?: string;
  notes: string;
  refId?: string;
  refKind?: "content" | "deliverable" | "phase" | "campaign";
  createdAt: string;
};

export type Activity = {
  id: string;
  projectId?: string;
  message: string;
  createdAt: string;
};

import type {
  CompetitorBenchmark,
  KnowledgeNotes,
  ProjectDecision,
  ProjectIntake,
  ProjectReference,
  ProjectSource,
  ReferenceBoard,
} from "@/core/ops/intake";

export type OpsPersist = {
  projects: OpsProject[];
  clients: Client[];
  proposals: Proposal[];
  ideas: ProjectIdea[];
  strategies: Record<string, ProjectStrategy>;
  links: ProjectLink[];
  phases: ProjectPhase[];
  deliverables: Deliverable[];
  contentItems: ContentItem[];
  campaigns: Campaign[];
  brandExtensions: Record<string, BrandExtension>;
  inspirations: Inspiration[];
  ideaNodes: IdeaNode[];
  ideaEdges: IdeaEdge[];
  calendarEvents: CalendarEvent[];
  activities: Activity[];
  sources: ProjectSource[];
  references: ProjectReference[];
  referenceBoards: ReferenceBoard[];
  decisions: ProjectDecision[];
  knowledge: Record<string, KnowledgeNotes>;
  intake: Record<string, ProjectIntake>;
  competitors: CompetitorBenchmark[];
  designTemplates: import("@/core/design/document").DesignTemplate[];
  projectCodeCounter: number;
};

export function emptyOpsPersist(): OpsPersist {
  return {
    projects: [],
    clients: [],
    proposals: [],
    ideas: [],
    strategies: {},
    links: [],
    phases: [],
    deliverables: [],
    contentItems: [],
    campaigns: [],
    brandExtensions: {},
    inspirations: [],
    ideaNodes: [],
    ideaEdges: [],
    calendarEvents: [],
    activities: [],
    sources: [],
    references: [],
    referenceBoards: [],
    decisions: [],
    knowledge: {},
    intake: {},
    competitors: [],
    designTemplates: [],
    projectCodeCounter: 5,
  };
}

export function emptyStrategy(projectId: string): ProjectStrategy {
  return {
    projectId,
    targetAudience: "",
    valueProposition: "",
    channels: "",
    keyMessages: "",
    kpis: "",
    campaignTimeline: "",
    problem: "",
    objective: "",
    positioning: "",
    competitors: "",
    risks: "",
    notes: "",
    projectObjective: "",
    businessObjective: "",
    communicationObjective: "",
    audience: "",
    userProblem: "",
    proofPoints: "",
    constraints: "",
    successCriteria: "",
    updatedAt: new Date().toISOString(),
  };
}

export function emptyBrandExtension(projectId: string): BrandExtension {
  return {
    projectId,
    voiceTone: "",
    keywords: [],
    typographyNotes: "",
    moodboard: [],
    moodboardSections: [],
    colorDescriptions: {},
    updatedAt: new Date().toISOString(),
  };
}
