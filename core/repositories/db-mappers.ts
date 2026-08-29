/** Explicit Postgres row mappers — never spread raw app objects into `.upsert()`. */

import type { ProjectSource, ProjectReference, ReferenceBoard, ProjectDecision, CompetitorBenchmark } from "@/core/ops/intake";
import type {
  Campaign,
  ContentItem,
  Deliverable,
  ProjectPhase,
  ProjectLink,
  ProjectIdea,
  OpsPersist,
  OpsProject,
} from "@/core/ops/types";
import type { DesignTemplate } from "@/core/design/document";
import type { ProjectConfig, StudioPost } from "@/core/types";
import {
  buildProjectRowCandidate,
  mapProjectToLiveRow,
  projectBrandExtensionRow,
  projectIntakeOverflowRow,
} from "@/core/repositories/project-row";

export {
  buildProjectRowCandidate,
  mapProjectToLiveRow,
  projectBrandExtensionRow,
  projectIntakeOverflowRow,
};

export function designToDbRow(projectId: string, post: StudioPost) {
  return {
    id: post.id,
    project_id: projectId,
    title: post.title,
    template: post.template,
    kind: post.kind,
    status: post.status,
    number: post.number,
    base_id: post.baseId,
    export_kind: post.exportKind,
    duration_ms: post.durationMs,
    variant_of: post.variantOf ?? null,
    variant_label: post.variantLabel ?? null,
    export_slug: post.exportSlug ?? null,
    document: post.document ?? null,
    design_state: post.design,
    reference_post_ids: post.referencePostIds ?? [],
    slides: post.slides ?? null,
    metadata: {},
    updated_at: new Date().toISOString(),
  };
}

export function feedToDbRow(projectId: string, feedId: string, viewMode: string) {
  return {
    id: feedId,
    project_id: projectId,
    name: "Feed",
    view_mode: viewMode,
  };
}

export function assetToDbRow(projectId: string, asset: ProjectConfig["assets"][number]) {
  return {
    id: asset.id,
    project_id: projectId,
    type: asset.category === "logos" ? "logo" : "photo",
    name: asset.name,
    public_url: asset.src.startsWith("data:") ? "" : asset.src,
    category: asset.category,
    tags: asset.tags,
    metadata: { legacySrc: asset.src.startsWith("data:") ? asset.src.slice(0, 200) : undefined },
  };
}

export function sourceToDbRow(source: ProjectSource) {
  return {
    id: source.id,
    project_id: source.projectId,
    title: source.title,
    source_type: source.sourceType,
    category: source.category,
    url: source.url,
    description: source.description,
    priority: source.priority,
    status: source.status,
    is_source_of_truth: source.isSourceOfTruth,
    storage_path: (source as { storagePath?: string }).storagePath ?? null,
    metadata: {
      fileName: source.fileName,
      fileMime: source.fileMime,
      content: source.content,
      tags: source.tags,
      notes: source.notes,
      relatedDecisionIds: source.relatedDecisionIds,
      relatedContentIds: source.relatedContentIds,
      relatedDeliverableIds: source.relatedDeliverableIds,
      supersededBy: source.supersededBy,
      extractedText: source.extractedText,
    },
    updated_at: source.updatedAt,
  };
}

export function referenceToDbRow(ref: ProjectReference) {
  return {
    id: ref.id,
    project_id: ref.projectId,
    board_id: ref.boardId || null,
    title: ref.title,
    url: ref.url,
    notes: ref.notes,
    likes: ref.whatWeLike,
    avoid: ref.whatNotToCopy,
    category: ref.category,
    metadata: { imageSrc: ref.imageSrc, tags: ref.tags },
    updated_at: ref.updatedAt,
  };
}

export function referenceBoardToDbRow(board: ReferenceBoard) {
  return {
    id: board.id,
    project_id: board.projectId,
    name: board.name,
    description: board.description,
  };
}

export function decisionToDbRow(decision: ProjectDecision) {
  return {
    id: decision.id,
    project_id: decision.projectId,
    decision: decision.decision,
    rationale: decision.rationale,
    area: decision.area,
    status: decision.status,
    supersedes_id: decision.supersededBy || null,
    metadata: { date: decision.date, sourceId: decision.sourceId, person: decision.person },
    updated_at: decision.updatedAt,
  };
}

export function campaignToDbRow(campaign: Campaign) {
  return {
    id: campaign.id,
    project_id: campaign.projectId,
    name: campaign.name,
    objective: campaign.objective,
    start_date: campaign.startDate ?? null,
    end_date: campaign.endDate ?? null,
    status: campaign.status,
    metadata: { kpis: campaign.kpis },
  };
}

export function contentItemToDbRow(item: ContentItem) {
  return {
    id: item.id,
    project_id: item.projectId,
    campaign_id: item.campaignId ?? null,
    title: item.title,
    platform: item.platform,
    format: item.format,
    publication_date: item.publicationDate ?? null,
    status: item.status,
    caption: item.caption,
    hashtags: item.hashtags,
    notes: item.notes,
    design_id: item.relatedPostId ?? null,
    updated_at: item.updatedAt,
  };
}

export function designTemplateToDbRow(template: DesignTemplate) {
  return {
    id: template.id,
    project_id: template.projectId ?? null,
    name: template.name,
    description: template.description,
    document: template.document ?? null,
    metadata: {
      tags: template.tags,
      mode: template.mode,
      legacyTemplate: template.legacyTemplate,
      legacyDesign: template.legacyDesign,
      exportKind: template.exportKind,
      durationMs: template.durationMs,
      sourcePostId: template.sourcePostId,
    },
    updated_at: new Date().toISOString(),
  };
}

export function orphanBrandExtensionRow(projectId: string, data: Record<string, unknown>) {
  return {
    project_id: projectId,
    data,
    updated_at: new Date().toISOString(),
  };
}

export function jsonbProjectRow(projectId: string, data: unknown, updatedAt?: string) {
  return {
    project_id: projectId,
    data,
    updated_at: updatedAt ?? new Date().toISOString(),
  };
}

export function workspaceMetaRow(key: string, value: unknown) {
  return {
    key,
    value,
    updated_at: new Date().toISOString(),
  };
}

export function clientToDbRow(client: OpsPersist["clients"][number]) {
  return { id: client.id, data: client };
}

export function proposalToDbRow(proposal: OpsPersist["proposals"][number]) {
  return { id: proposal.id, data: proposal };
}

export function deliverableToDbRow(item: Deliverable) {
  return { id: item.id, project_id: item.projectId, data: item };
}

export function phaseToDbRow(phase: ProjectPhase) {
  return { id: phase.id, project_id: phase.projectId, data: phase };
}

export function projectLinkToDbRow(link: ProjectLink) {
  return { id: link.id, project_id: link.projectId, data: link };
}

export function inspirationToDbRow(item: OpsPersist["inspirations"][number]) {
  return { id: item.id, data: item };
}

export function ideaToDbRow(idea: ProjectIdea) {
  return { id: idea.id, project_id: idea.projectId, data: idea };
}

export function ideaNodeToDbRow(node: OpsPersist["ideaNodes"][number]) {
  return { id: node.id, data: node };
}

export function ideaEdgeToDbRow(edge: OpsPersist["ideaEdges"][number]) {
  return { id: edge.id, data: edge };
}

export function calendarEventToDbRow(event: OpsPersist["calendarEvents"][number]) {
  return { id: event.id, data: event };
}

export function activityToDbRow(activity: OpsPersist["activities"][number]) {
  return { id: activity.id, data: activity };
}

export function competitorToDbRow(item: CompetitorBenchmark) {
  return { id: item.id, project_id: item.projectId, data: item };
}
