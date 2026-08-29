/** Pure hydration helpers — shared by store and cloud sync. */

import type { AppPersist, PostPatch, ProjectConfig, ProjectOverlay, StudioPost } from "@/core/types";
import { SEED_PROJECTS } from "@/projects";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function applyPostPatch(post: StudioPost, patch?: PostPatch): StudioPost {
  if (!patch) return clone(post);
  const next = clone(post);
  if (patch.status) next.status = patch.status;
  if (patch.title) next.title = patch.title;
  if (patch.design) next.design = { ...next.design, ...patch.design };
  if (patch.document) next.document = patch.document;
  if (patch.referencePostIds !== undefined) next.referencePostIds = patch.referencePostIds;
  if (next.slides) {
    if (patch.removedSlideIds?.length) {
      next.slides = next.slides.filter((slide) => !patch.removedSlideIds?.includes(slide.id));
    }
    if (patch.extraSlides?.length) {
      const existing = new Set(next.slides.map((slide) => slide.id));
      for (const slide of patch.extraSlides) {
        if (!existing.has(slide.id)) next.slides.push(clone(slide));
      }
    }
    if (patch.slidePatches) {
      next.slides = next.slides.map((slide) => {
        const slidePatch = patch.slidePatches?.[slide.id];
        if (!slidePatch) return slide;
        return {
          ...slide,
          title: slidePatch.title ?? slide.title,
          design: slidePatch.design ? { ...slide.design, ...slidePatch.design } : slide.design,
        };
      });
    }
    if (patch.slideOrder?.length) {
      const map = new Map(next.slides.map((slide) => [slide.id, slide]));
      const ordered = patch.slideOrder
        .map((id) => map.get(id))
        .filter((slide): slide is NonNullable<typeof slide> => Boolean(slide));
      const rest = next.slides.filter((slide) => !patch.slideOrder?.includes(slide.id));
      next.slides = [...ordered, ...rest];
    }
  }
  return next;
}

export function hydratePosts(base: StudioPost[], overlay?: ProjectOverlay["posts"]): StudioPost[] {
  const byId = new Map<string, StudioPost>();
  for (const post of base) byId.set(post.id, clone(post));
  for (const extra of overlay?.extras ?? []) byId.set(extra.id, clone(extra));
  const deleted = new Set(overlay?.deletedIds ?? []);
  const posts: StudioPost[] = [];
  for (const [id, post] of byId) {
    if (deleted.has(id)) continue;
    posts.push(applyPostPatch(post, overlay?.patches[id]));
  }
  const order = overlay?.order?.length ? overlay.order : base.map((post) => post.id);
  const mapped = order
    .map((id) => posts.find((post) => post.id === id))
    .filter((post): post is StudioPost => Boolean(post));
  const missing = posts.filter((post) => !order.includes(post.id));
  return [...mapped, ...missing];
}

export function mergeProject(base: ProjectConfig, overlay?: ProjectOverlay): ProjectConfig {
  const deletedAssets = new Set(overlay?.deletedAssetIds ?? []);
  const assets = [
    ...(overlay?.assets
      ? [...base.assets.filter((asset) => !overlay.assets?.some((item) => item.id === asset.id)), ...overlay.assets]
      : base.assets),
  ].filter((asset) => !deletedAssets.has(asset.id));
  return {
    ...base,
    name: overlay?.name ?? base.name,
    brand: overlay?.brand ?? base.brand,
    formatId: overlay?.formatId ?? base.formatId,
    exportPrefix: overlay?.exportPrefix ?? base.exportPrefix,
    assets,
    posts: hydratePosts(base.posts, overlay?.posts),
  };
}

/** Same effective project list the store renders: seeds + user projects, merged with overlays. */
export function buildEffectiveProjects(persist: AppPersist): ProjectConfig[] {
  return [
    ...SEED_PROJECTS.map((p) => mergeProject(p, persist.overlays[p.id])),
    ...persist.userProjects.map((p) => mergeProject(p, persist.overlays[p.id])),
  ];
}

export type EffectiveWorkspaceDiagnostics = {
  effectiveProjectIds: string[];
  seedProjectIds: string[];
  opsProjectIds: string[];
  overlayProjectIds: string[];
};

export function effectiveWorkspaceDiagnostics(persist: AppPersist): EffectiveWorkspaceDiagnostics {
  return {
    effectiveProjectIds: buildEffectiveProjects(persist).map((p) => p.id),
    seedProjectIds: SEED_PROJECTS.map((p) => p.id),
    opsProjectIds: persist.ops.projects.map((p) => p.id),
    overlayProjectIds: Object.keys(persist.overlays),
  };
}
