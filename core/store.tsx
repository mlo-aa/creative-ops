"use client";

import { sanitizeDesignColors } from "@/core/color";
import { emptyDesign } from "@/core/design";
import { DEFAULT_FORMAT_ID } from "@/core/formats";
import type {
  AppPersist,
  BrandProfile,
  CarouselSlide,
  DesignState,
  PostPatch,
  ProjectAsset,
  ProjectConfig,
  ProjectOverlay,
  StudioPost,
  StudioStatus,
} from "@/core/types";
import { getSeedProject, SEED_PROJECTS } from "@/projects";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "scs:v1";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 32) || `project-${Date.now()}`
  );
}

function emptyPersist(): AppPersist {
  return { version: 1, userProjects: [], overlays: {} };
}

function applyPostPatch(post: StudioPost, patch?: PostPatch): StudioPost {
  if (!patch) return clone(post);
  const next = clone(post);
  if (patch.status) next.status = patch.status;
  if (patch.title) next.title = patch.title;
  if (patch.design) next.design = { ...next.design, ...patch.design };
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
        .filter((slide): slide is CarouselSlide => Boolean(slide));
      const rest = next.slides.filter((slide) => !patch.slideOrder?.includes(slide.id));
      next.slides = [...ordered, ...rest];
    }
  }
  return next;
}

function hydratePosts(base: StudioPost[], overlay?: ProjectOverlay["posts"]): StudioPost[] {
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

function mergeProject(base: ProjectConfig, overlay?: ProjectOverlay): ProjectConfig {
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

function loadPersist(): AppPersist {
  if (typeof window === "undefined") return emptyPersist();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPersist();
    const parsed = JSON.parse(raw) as AppPersist;
    if (parsed?.version !== 1) return emptyPersist();
    return {
      version: 1,
      userProjects: parsed.userProjects ?? [],
      overlays: parsed.overlays ?? {},
    };
  } catch {
    return emptyPersist();
  }
}

function savePersist(next: AppPersist) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full */
  }
}

function nextVariantId(baseId: string, existing: string[]) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const letter of letters) {
    const id = `${baseId}${letter}`;
    if (!existing.includes(id)) return id;
  }
  let n = 2;
  while (existing.includes(`${baseId}${n}`)) n += 1;
  return `${baseId}${n}`;
}

type StudioContextValue = {
  ready: boolean;
  persist: AppPersist;
  projects: ProjectConfig[];
  getProject: (id: string) => ProjectConfig | undefined;
  createProject: (input: {
    name: string;
    brandName: string;
    primary: string;
    background: string;
    text: string;
    accent: string;
    logoSrc?: string;
    formatId: string;
  }) => string;
  updateBrand: (id: string, brand: BrandProfile) => void;
  addAsset: (id: string, asset: ProjectAsset) => void;
  removeAsset: (id: string, assetId: string) => void;
  renameAsset: (id: string, assetId: string, name: string) => void;
  updateSettings: (id: string, patch: { formatId?: string; exportPrefix?: string; name?: string }) => void;
  postsOf: (id: string) => StudioPost[];
  updateDesign: (projectId: string, postId: string, patch: Partial<DesignState>, slideId?: string) => void;
  setStatus: (projectId: string, postId: string, status: StudioStatus) => void;
  reorder: (projectId: string, section: "active" | "draft", ids: string[]) => void;
  updateSlideOrder: (projectId: string, postId: string, ids: string[]) => void;
  duplicateSlide: (projectId: string, postId: string, slideId: string) => string | null;
  deleteSlide: (projectId: string, postId: string, slideId: string) => void;
  duplicateAsVariant: (projectId: string, postId: string) => string | null;
  createPost: (projectId: string, template: string, title: string, kind: "single" | "carousel") => string;
  deletePost: (projectId: string, postId: string) => void;
  resetDesign: (projectId: string, postId: string) => void;
  resetProject: (projectId: string) => void;
  importProject: (config: ProjectConfig) => string;
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [persist, setPersist] = useState<AppPersist>(emptyPersist);

  useEffect(() => {
    const loaded = loadPersist();
    setPersist(loaded);
    setReady(true);
  }, []);

  const commit = useCallback((updater: (prev: AppPersist) => AppPersist) => {
    setPersist((prev) => {
      const next = updater(prev);
      savePersist(next);
      return next;
    });
  }, []);

  const projects = useMemo(() => {
    const seeded = SEED_PROJECTS.map((project) => mergeProject(project, persist.overlays[project.id]));
    const users = persist.userProjects.map((project) => mergeProject(project, persist.overlays[project.id]));
    return [...seeded, ...users];
  }, [persist]);

  const getProject = useCallback(
    (id: string) => projects.find((project) => project.id === id),
    [projects],
  );

  const patchOverlay = useCallback(
    (id: string, updater: (current: ProjectOverlay) => ProjectOverlay) => {
      commit((prev) => ({
        ...prev,
        overlays: {
          ...prev.overlays,
          [id]: updater(prev.overlays[id] ?? {}),
        },
      }));
    },
    [commit],
  );

  const createProject = useCallback(
    (input: {
      name: string;
      brandName: string;
      primary: string;
      background: string;
      text: string;
      accent: string;
      logoSrc?: string;
      formatId: string;
    }) => {
      let created = slugify(input.name);
      commit((prev) => {
        const existing = [
          ...SEED_PROJECTS.map((item) => item.id),
          ...prev.userProjects.map((item) => item.id),
        ];
        let id = created;
        let n = 2;
        while (existing.includes(id)) {
          id = `${created}-${n}`;
          n += 1;
        }
        created = id;
        const brand: BrandProfile = {
          name: input.brandName,
          shortName: input.brandName.toLowerCase(),
          description: "",
          tagline: "",
          website: "",
          colors: [
            { id: "primary", name: "Primary", hex: input.primary },
            { id: "background", name: "Background", hex: input.background },
            { id: "text", name: "Text", hex: input.text },
            { id: "accent", name: "Accent", hex: input.accent },
          ],
          logos: input.logoSrc
            ? [{ id: "primary", name: "Primary logo", src: input.logoSrc, role: "primary" }, { id: "isotipo", name: "Mark", src: input.logoSrc, role: "isotipo" }]
            : [],
          fonts: {
            primary: 'var(--font-geist-sans), Helvetica Neue, Helvetica, Arial, sans-serif',
            secondary: 'var(--font-geist-sans), Helvetica Neue, Helvetica, Arial, sans-serif',
            display: 'var(--font-geist-sans), Helvetica Neue, Helvetica, Arial, sans-serif',
            body: 'var(--font-geist-sans), Helvetica Neue, Helvetica, Arial, sans-serif',
          },
          defaultBackground: "background",
          defaultText: "text",
          defaultAccent: "accent",
        };
        const project: ProjectConfig = {
          id,
          name: input.name,
          createdAt: new Date().toISOString(),
          formatId: input.formatId || DEFAULT_FORMAT_ID,
          exportPrefix: slugify(input.name),
          brand,
          assets: input.logoSrc
            ? [{ id: "logo", name: "Logo", src: input.logoSrc, category: "logos", tags: [] }]
            : [],
          posts: [],
        };
        return { ...prev, userProjects: [...prev.userProjects, project] };
      });
      return created;
    },
    [commit],
  );

  const updateBrand = useCallback(
    (id: string, brand: BrandProfile) => {
      commit((prev) => {
        const user = prev.userProjects.find((item) => item.id === id);
        if (user) {
          return {
            ...prev,
            userProjects: prev.userProjects.map((item) =>
              item.id === id ? { ...item, brand } : item,
            ),
          };
        }
        return {
          ...prev,
          overlays: {
            ...prev.overlays,
            [id]: { ...prev.overlays[id], brand },
          },
        };
      });
    },
    [commit],
  );

  const addAsset = useCallback(
    (id: string, asset: ProjectAsset) => {
      patchOverlay(id, (current) => ({
        ...current,
        assets: [...(current.assets ?? []), asset],
        deletedAssetIds: (current.deletedAssetIds ?? []).filter((item) => item !== asset.id),
      }));
    },
    [patchOverlay],
  );

  const removeAsset = useCallback(
    (id: string, assetId: string) => {
      patchOverlay(id, (current) => ({
        ...current,
        assets: (current.assets ?? []).filter((asset) => asset.id !== assetId),
        deletedAssetIds: [...new Set([...(current.deletedAssetIds ?? []), assetId])],
      }));
    },
    [patchOverlay],
  );

  const renameAsset = useCallback(
    (id: string, assetId: string, name: string) => {
      patchOverlay(id, (current) => ({
        ...current,
        assets: (current.assets ?? []).map((asset) =>
          asset.id === assetId ? { ...asset, name } : asset,
        ),
      }));
    },
    [patchOverlay],
  );

  const updateSettings = useCallback(
    (id: string, patch: { formatId?: string; exportPrefix?: string; name?: string }) => {
      commit((prev) => {
        const user = prev.userProjects.find((item) => item.id === id);
        if (user) {
          return {
            ...prev,
            userProjects: prev.userProjects.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          };
        }
        return {
          ...prev,
          overlays: {
            ...prev.overlays,
            [id]: { ...prev.overlays[id], formatId: patch.formatId, exportPrefix: patch.exportPrefix, name: patch.name },
          },
        };
      });
    },
    [commit],
  );

  const postsOf = useCallback(
    (id: string) => getProject(id)?.posts ?? [],
    [getProject],
  );

  const updateDesign = useCallback(
    (projectId: string, postId: string, designPatch: Partial<DesignState>, slideId?: string) => {
      const project = getProject(projectId);
      const post = project?.posts.find((item) => item.id === postId);
      if (!project || !post) return;
      const target = slideId
        ? post.slides?.find((slide) => slide.id === slideId)?.design
        : post.design;
      if (!target) return;
      const merged = { ...target, ...designPatch };
      const colors = sanitizeDesignColors(project.brand, merged);
      const nextDesign = { ...merged, ...colors };
      patchOverlay(projectId, (current) => {
        const posts = current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
        const patch = posts.patches[postId] ?? {};
        const nextPatch: PostPatch = slideId
          ? {
              ...patch,
              slidePatches: {
                ...patch.slidePatches,
                [slideId]: {
                  ...patch.slidePatches?.[slideId],
                  design: { ...patch.slidePatches?.[slideId]?.design, ...nextDesign },
                },
              },
            }
          : { ...patch, design: { ...patch.design, ...nextDesign } };
        return {
          ...current,
          posts: {
            ...posts,
            order: posts.order.length ? posts.order : project.posts.map((item) => item.id),
            patches: { ...posts.patches, [postId]: nextPatch },
          },
        };
      });
    },
    [getProject, patchOverlay],
  );

  const setStatus = useCallback(
    (projectId: string, postId: string, status: StudioStatus) => {
      const posts = postsOf(projectId);
      const post = posts.find((item) => item.id === postId);
      if (!post) return;
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
        const patches = { ...data.patches };
        if (status === "active") {
          const base = post.variantOf ?? post.baseId;
          for (const sibling of posts) {
            if (sibling.id === postId) continue;
            if (sibling.id === base || sibling.variantOf === base || sibling.baseId === base) {
              patches[sibling.id] = { ...patches[sibling.id], status: "draft" };
            }
          }
        }
        patches[postId] = { ...patches[postId], status };
        return { ...current, posts: { ...data, patches } };
      });
    },
    [patchOverlay, postsOf],
  );

  const reorder = useCallback(
    (projectId: string, _section: "active" | "draft", ids: string[]) => {
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
        const project = getSeedProject(projectId);
        const baseOrder =
          data.order.length
            ? data.order
            : (getProject(projectId)?.posts.map((post) => post.id) ?? []);
        const sectionSet = new Set(ids);
        let i = 0;
        const merged = baseOrder.map((id) => (sectionSet.has(id) ? ids[i++] ?? id : id));
        const leftover = ids.filter((id) => !merged.includes(id));
        return { ...current, posts: { ...data, order: [...merged, ...leftover] } };
      });
    },
    [getProject, patchOverlay],
  );

  const updateSlideOrder = useCallback(
    (projectId: string, postId: string, ids: string[]) => {
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
        return {
          ...current,
          posts: {
            ...data,
            patches: {
              ...data.patches,
              [postId]: { ...data.patches[postId], slideOrder: ids },
            },
          },
        };
      });
    },
    [patchOverlay],
  );

  const duplicateSlide = useCallback(
    (projectId: string, postId: string, slideId: string) => {
      const post = postsOf(projectId).find((item) => item.id === postId);
      const slide = post?.slides?.find((item) => item.id === slideId);
      if (!post?.slides || !slide) return null;
      const copy: CarouselSlide = {
        ...clone(slide),
        id: `slide-${Date.now()}`,
        title: `${slide.title} copy`,
      };
      const order = post.slides.map((item) => item.id);
      order.splice(order.indexOf(slideId) + 1, 0, copy.id);
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
        const patch = data.patches[postId] ?? {};
        return {
          ...current,
          posts: {
            ...data,
            patches: {
              ...data.patches,
              [postId]: {
                ...patch,
                extraSlides: [...(patch.extraSlides ?? []), copy],
                slideOrder: order,
              },
            },
          },
        };
      });
      return copy.id;
    },
    [patchOverlay, postsOf],
  );

  const deleteSlide = useCallback(
    (projectId: string, postId: string, slideId: string) => {
      const post = postsOf(projectId).find((item) => item.id === postId);
      if (!post?.slides || post.slides.length <= 1) return;
      const order = post.slides.map((slide) => slide.id).filter((id) => id !== slideId);
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
        const patch = data.patches[postId] ?? {};
        return {
          ...current,
          posts: {
            ...data,
            patches: {
              ...data.patches,
              [postId]: {
                ...patch,
                removedSlideIds: [...new Set([...(patch.removedSlideIds ?? []), slideId])],
                extraSlides: (patch.extraSlides ?? []).filter((slide) => slide.id !== slideId),
                slideOrder: order,
              },
            },
          },
        };
      });
    },
    [patchOverlay, postsOf],
  );

  const duplicateAsVariant = useCallback(
    (projectId: string, postId: string) => {
      const posts = postsOf(projectId);
      const post = posts.find((item) => item.id === postId);
      if (!post) return null;
      const variantId = nextVariantId(post.baseId, posts.map((item) => item.id));
      const extra: StudioPost = {
        ...clone(post),
        id: variantId,
        number: variantId,
        title: `${post.title.replace(/ · .+$/, "")} · ${variantId}`,
        status: "draft",
        variantOf: post.baseId,
        variantLabel: variantId,
      };
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? {
          order: posts.map((item) => item.id),
          extras: [],
          patches: {},
          deletedIds: [],
        };
        return {
          ...current,
          posts: {
            ...data,
            extras: [...data.extras, extra],
            order: [...(data.order.length ? data.order : posts.map((item) => item.id)), variantId],
          },
        };
      });
      return variantId;
    },
    [patchOverlay, postsOf],
  );

  const createPost = useCallback(
    (projectId: string, template: string, title: string, kind: "single" | "carousel") => {
      const project = getProject(projectId);
      if (!project) return "";
      const id = `${Date.now()}`;
      const design = emptyDesign(project.brand, { headline: title });
      const extra: StudioPost = {
        id,
        baseId: id,
        number: String(project.posts.length + 1).padStart(2, "0"),
        title,
        exportKind: "jpg",
        durationMs: 0,
        status: "draft",
        kind,
        template,
        design,
        slides:
          kind === "carousel"
            ? [{ id: `${id}-1`, template, title: "Slide 01", design }]
            : undefined,
      };
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? {
          order: project.posts.map((post) => post.id),
          extras: [],
          patches: {},
          deletedIds: [],
        };
        return {
          ...current,
          posts: {
            ...data,
            extras: [...data.extras, extra],
            order: [...(data.order.length ? data.order : project.posts.map((post) => post.id)), id],
          },
        };
      });
      return id;
    },
    [getProject, patchOverlay],
  );

  const deletePost = useCallback(
    (projectId: string, postId: string) => {
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
        return {
          ...current,
          posts: {
            ...data,
            extras: data.extras.filter((post) => post.id !== postId),
            deletedIds: [...new Set([...data.deletedIds, postId])],
            order: data.order.filter((id) => id !== postId),
          },
        };
      });
    },
    [patchOverlay],
  );

  const resetDesign = useCallback(
    (projectId: string, postId: string) => {
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] };
        const { [postId]: _removed, ...rest } = data.patches;
        return { ...current, posts: { ...data, patches: rest } };
      });
    },
    [patchOverlay],
  );

  const resetProject = useCallback(
    (projectId: string) => {
      commit((prev) => {
        const { [projectId]: _removed, ...overlays } = prev.overlays;
        return {
          ...prev,
          overlays,
          userProjects: prev.userProjects.filter((item) => item.id !== projectId || getSeedProject(projectId)),
        };
      });
    },
    [commit],
  );

  const importProject = useCallback(
    (config: ProjectConfig) => {
      let id = config.id || slugify(config.name);
      commit((prev) => {
        const existing = [
          ...SEED_PROJECTS.map((item) => item.id),
          ...prev.userProjects.map((item) => item.id),
        ];
        let nextId = id;
        let n = 2;
        while (existing.includes(nextId) && getSeedProject(nextId) === undefined) {
          nextId = `${id}-${n}`;
          n += 1;
        }
        id = nextId;
        const project = { ...config, id, seeded: false };
        return { ...prev, userProjects: [...prev.userProjects.filter((item) => item.id !== id), project] };
      });
      return id;
    },
    [commit],
  );

  const value = useMemo<StudioContextValue>(
    () => ({
      ready,
      persist,
      projects,
      getProject,
      createProject,
      updateBrand,
      addAsset,
      removeAsset,
      renameAsset,
      updateSettings,
      postsOf,
      updateDesign,
      setStatus,
      reorder,
      updateSlideOrder,
      duplicateSlide,
      deleteSlide,
      duplicateAsVariant,
      createPost,
      deletePost,
      resetDesign,
      resetProject,
      importProject,
    }),
    [
      ready,
      persist,
      projects,
      getProject,
      createProject,
      updateBrand,
      addAsset,
      removeAsset,
      renameAsset,
      updateSettings,
      postsOf,
      updateDesign,
      setStatus,
      reorder,
      updateSlideOrder,
      duplicateSlide,
      deleteSlide,
      duplicateAsVariant,
      createPost,
      deletePost,
      resetDesign,
      resetProject,
      importProject,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const value = useContext(StudioContext);
  if (!value) throw new Error("useStudio must be used within StudioProvider");
  return value;
}

export function exportProjectPayload(project: ProjectConfig) {
  const slim: ProjectConfig = {
    ...project,
    assets: project.assets.filter((asset) => !asset.src.startsWith("data:")),
    posts: project.posts.map((post) => ({
      ...post,
      design: { ...post.design, imageSrc: post.design.imageSrc.startsWith("data:") ? "" : post.design.imageSrc },
      slides: post.slides?.map((slide) => ({
        ...slide,
        design: {
          ...slide.design,
          imageSrc: slide.design.imageSrc.startsWith("data:") ? "" : slide.design.imageSrc,
        },
      })),
    })),
  };
  return JSON.stringify(slim, null, 2);
}
