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
  useRef,
  useState,
  type ReactNode,
} from "react";

import { blankCanvasDocument } from "@/core/design/document";
import type { DesignDocument, DesignTemplate } from "@/core/design/document";
import { getProjectCreativeContext } from "@/core/design/creativeContext";
import { designGenerationProvider, documentToDesignState, type GenerateDesignBrief, type VariationMode } from "@/core/design/generation/provider";
import type {
  GenerateStoryboardBrief,
} from "@/core/video/generation/provider";
import { attachCaptionsToDocument } from "@/core/video/captions";
import { applyScriptToDocument, getEffectiveVoiceoverScript } from "@/core/video/script";
import type { VideoDocument } from "@/core/video/document";
import { cloneVideoDocument, uid } from "@/core/video/document";
import { parseAudioApiResponse } from "@/core/video/audio/client-errors";
import {
  formatVoiceoverValidationError,
  validateVoiceoverScript,
} from "@/core/video/script-validation";
import { sanitizeJsonbString, sanitizeSnapshotForJsonb } from "@/core/repositories/jsonb-sanitize";
import {
  applyTemplateToBrand,
  getDesignTemplate,
  listDesignTemplates,
  postToTemplate,
} from "@/core/design/templateLibrary";
import { ensureOpsMigration, nextProjectCode } from "@/core/ops/migrate";
import { getProjectContext, type ProjectContextPackage } from "@/core/ops/context";
import {
  emptyIntake,
  emptyKnowledge,
  type CompetitorBenchmark,
  type ProjectDecision,
  type ProjectIntake,
  type ProjectReference,
  type ProjectSource,
  type ReferenceBoard,
} from "@/core/ops/intake";
import {
  emptyBrandExtension,
  emptyOpsPersist,
  emptyStrategy,
  type Activity,
  type BrandExtension,
  type CalendarEvent,
  type Campaign,
  type Client,
  type ContentItem,
  type Deliverable,
  type Inspiration,
  type IdeaEdge,
  type IdeaNode,
  type OpsPersist,
  type OpsProject,
  type ProjectIdea,
  type ProjectLink,
  type ProjectPhase,
  type ProjectStrategy,
  type Proposal,
} from "@/core/ops/types";
import { mergeProject, dedupeIds } from "@/core/repository/hydrate";
import {
  loadCache,
  loadLegacyLocal,
  saveCache,
  clearLegacyLocal,
  type SyncStatus,
} from "@/core/repository/cache";
import { loadPersist, patchOps } from "@/core/repository/persist";
import {
  cloudPersistenceEnabled,
  queueCloudSync,
  subscribeSyncStatus,
  syncNow,
} from "@/core/repository/cloud-sync";
import { countImportPayload } from "@/core/repositories/import-stats";
import { importLocalToCloudApi, testCloudConnection, fetchMigrationStatus, resetMigrationMarkerApi, buildMigrationDiagnostics, fetchWorkspaceSnapshotApi, type MigrationDiagnostics } from "@/core/repositories/cloud-api";
import type { CloudTestResult } from "@/app/api/cloud/test/route";
import { detectMigrationRecovery } from "@/core/repositories/migration-recovery";
import { createDesignVersion, listDesignVersions, type DesignVersionRow } from "@/core/repositories/designs";
import { getSupabaseClient } from "@/lib/supabase/client";

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
  return { version: 2, userProjects: [], overlays: {}, ops: emptyOpsPersist() };
}

function loadLocalFallback(): AppPersist {
  if (cloudPersistenceEnabled()) {
    const cache = loadCache();
    if (cache) return cache;
  }
  return loadPersist();
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
  createBlankDesign: (projectId: string, title?: string) => string;
  createDesignFromTemplate: (projectId: string, templateId: string, title?: string) => string;
  generateDesign: (projectId: string, brief: GenerateDesignBrief) => Promise<string>;
  generateStoryboard: (
    projectId: string,
    brief: import("@/core/video/generation/provider").GenerateStoryboardBrief,
    voiceId?: string,
  ) => Promise<{
    postId: string;
    notice?: string;
    mockReason?: string;
    fallbackFromClaude?: boolean;
  }>;
  updateVideoDocument: (projectId: string, postId: string, video: import("@/core/video/document").VideoDocument) => void;
  generateVideoVoiceover: (projectId: string, postId: string) => Promise<import("@/core/video/document").VideoDocument | null>;
  generateVideoMusic: (projectId: string, postId: string, prompt: string) => Promise<import("@/core/video/document").VideoDocument | null>;
  generateSceneSoundEffect: (
    projectId: string,
    postId: string,
    sceneId: string,
    prompt: string,
    sfxId?: string,
  ) => Promise<import("@/core/video/document").VideoDocument | null>;
  generateVideoCaptions: (projectId: string, postId: string) => Promise<import("@/core/video/document").VideoDocument | null>;
  exportVideoMp4: (projectId: string, postId: string) => Promise<{ ok: boolean; publicUrl?: string; errorMessage?: string; requiresWorker?: boolean }>;
  generateDesignVariations: (projectId: string, postId: string, mode: VariationMode) => Promise<string[]>;
  saveDesignAsTemplate: (projectId: string, postId: string, name: string) => string;
  setDesignReferences: (projectId: string, postId: string, referencePostIds: string[]) => void;
  updateDocument: (projectId: string, postId: string, document: DesignDocument) => void;
  saveDesignVersion: (projectId: string, postId: string, label?: string) => Promise<void>;
  listDesignVersions: (postId: string) => Promise<DesignVersionRow[]>;
  restoreDesignVersion: (projectId: string, postId: string, versionId: string) => Promise<void>;
  duplicateDesignFromVersion: (projectId: string, postId: string, versionId: string) => Promise<string>;
  listProjectDesignTemplates: (projectId: string) => DesignTemplate[];
  getProjectCreativeContext: (projectId: string) => import("@/core/design/creativeContext").ProjectCreativeContext | null;
  deletePost: (projectId: string, postId: string) => void;
  resetDesign: (projectId: string, postId: string) => void;
  resetProject: (projectId: string) => void;
  importProject: (config: ProjectConfig) => string;
  /** Creative Operations */
  ops: OpsPersist;
  saveStatus: "idle" | "saving" | "saved";
  syncStatus: SyncStatus;
  cloudEnabled: boolean;
  showMigrationPrompt: boolean;
  migrationRecoveryMode: boolean;
  importLocalData: () => Promise<MigrationDiagnostics>;
  dismissMigration: () => void;
  getMigrationDiagnostics: () => MigrationDiagnostics;
  refreshMigrationDiagnostics: () => Promise<MigrationDiagnostics>;
  testCloudConnection: () => Promise<CloudTestResult>;
  resetMigrationMarker: () => Promise<{ ok: boolean; errorMessage?: string }>;
  getOpsProject: (id: string) => OpsProject | undefined;
  createOpsProject: (input: {
    name: string;
    clientName: string;
    type: OpsProject["type"];
    types?: OpsProject["type"][];
    code?: string;
    color: string;
    startDate?: string;
    deadline?: string;
    description?: string;
    clientId?: string;
    owner?: string;
    status?: OpsProject["status"];
    createBrandKit?: boolean;
    formatId?: string;
    intakeDraft?: boolean;
    seedDeliverables?: string[];
  }) => string;
  updateOpsProject: (id: string, patch: Partial<OpsProject>) => void;
  logActivity: (message: string, projectId?: string) => void;
  getStrategy: (projectId: string) => ProjectStrategy;
  updateStrategy: (projectId: string, patch: Partial<ProjectStrategy>) => void;
  getBrandExtension: (projectId: string) => BrandExtension;
  updateBrandExtension: (projectId: string, patch: Partial<BrandExtension>) => void;
  addIdea: (idea: Omit<ProjectIdea, "id" | "createdAt" | "updatedAt">) => string;
  updateIdea: (id: string, patch: Partial<ProjectIdea>) => void;
  deleteIdea: (id: string) => void;
  addLink: (link: Omit<ProjectLink, "id" | "createdAt">) => string;
  updateLink: (id: string, patch: Partial<ProjectLink>) => void;
  deleteLink: (id: string) => void;
  addPhase: (phase: Omit<ProjectPhase, "id" | "createdAt">) => string;
  updatePhase: (id: string, patch: Partial<ProjectPhase>) => void;
  deletePhase: (id: string) => void;
  addDeliverable: (item: Omit<Deliverable, "id" | "createdAt" | "updatedAt">) => string;
  updateDeliverable: (id: string, patch: Partial<Deliverable>) => void;
  deleteDeliverable: (id: string) => void;
  addContentItem: (item: Omit<ContentItem, "id" | "createdAt" | "updatedAt">) => string;
  updateContentItem: (id: string, patch: Partial<ContentItem>) => void;
  deleteContentItem: (id: string) => void;
  createDesignFromContent: (contentId: string) => string | null;
  addCampaign: (campaign: Omit<Campaign, "id" | "createdAt">) => string;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  addClient: (client: Omit<Client, "id" | "createdAt" | "updatedAt">) => string;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addProposal: (proposal: Omit<Proposal, "id" | "createdAt" | "updatedAt">) => string;
  updateProposal: (id: string, patch: Partial<Proposal>) => void;
  createProjectFromProposal: (proposalId: string) => string | null;
  addInspiration: (item: Omit<Inspiration, "id" | "createdAt">) => string;
  updateInspiration: (id: string, patch: Partial<Inspiration>) => void;
  deleteInspiration: (id: string) => void;
  setIdeaMap: (nodes: IdeaNode[], edges: IdeaEdge[]) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, "id" | "createdAt">) => string;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  allPosts: () => { project: ProjectConfig; post: StudioPost }[];
  getIntake: (projectId: string) => ProjectIntake;
  updateIntake: (projectId: string, patch: Partial<ProjectIntake>) => void;
  getKnowledge: (projectId: string) => import("@/core/ops/intake").KnowledgeNotes;
  updateKnowledge: (projectId: string, patch: Partial<import("@/core/ops/intake").KnowledgeNotes>) => void;
  addSource: (source: Omit<ProjectSource, "id" | "createdAt" | "updatedAt" | "dateAdded">) => string;
  updateSource: (id: string, patch: Partial<ProjectSource>) => void;
  deleteSource: (id: string) => void;
  getSource: (id: string) => ProjectSource | undefined;
  addReference: (ref: Omit<ProjectReference, "id" | "createdAt" | "updatedAt">) => string;
  updateReference: (id: string, patch: Partial<ProjectReference>) => void;
  deleteReference: (id: string) => void;
  addReferenceBoard: (board: Omit<ReferenceBoard, "id" | "createdAt">) => string;
  updateReferenceBoard: (id: string, patch: Partial<ReferenceBoard>) => void;
  deleteReferenceBoard: (id: string) => void;
  addDecision: (decision: Omit<ProjectDecision, "id" | "createdAt" | "updatedAt">) => string;
  updateDecision: (id: string, patch: Partial<ProjectDecision>) => void;
  deleteDecision: (id: string) => void;
  addCompetitor: (item: Omit<CompetitorBenchmark, "id" | "createdAt" | "updatedAt">) => string;
  updateCompetitor: (id: string, patch: Partial<CompetitorBenchmark>) => void;
  deleteCompetitor: (id: string) => void;
  getProjectContext: (projectId: string) => ProjectContextPackage | null;
  previewProjectCode: () => string;
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [persist, setPersist] = useState<AppPersist>(emptyPersist);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [migrationRecoveryMode, setMigrationRecoveryMode] = useState(false);
  const migrationStatusRef = useRef<import("@/app/api/cloud/migration-status/route").MigrationStatusResult | null>(null);
  const cloudEnabled = cloudPersistenceEnabled();

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      let loaded: AppPersist = loadLocalFallback();

      if (cloudEnabled) {
        try {
          const snapshot = await fetchWorkspaceSnapshotApi();
          if (snapshot) {
            loaded = snapshot;
          } else {
            loaded = loadLocalFallback();
          }
        } catch (err) {
          console.error("[boot] snapshot load failed, using cache", err);
          setSyncStatus("offline");
          loaded = loadLocalFallback();
        }
      } else {
        loaded = loadPersist();
      }

      const seeded = SEED_PROJECTS.map((p) => mergeProject(p, loaded.overlays[p.id]));
      const merged = {
        ...loaded,
        ops: ensureOpsMigration(loaded.ops ?? emptyOpsPersist(), [...seeded, ...loaded.userProjects]),
      };

      if (!cancelled) {
        setPersist(merged);
        saveCache(merged);
        setReady(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [cloudEnabled]);

  useEffect(() => {
    return subscribeSyncStatus((status) => {
      setSyncStatus(status);
      if (status === "saving") setSaveStatus("saving");
      if (status === "saved") {
        setSaveStatus("saved");
        window.setTimeout(() => setSaveStatus("idle"), 1500);
      }
      if (status === "unsynced" || status === "offline") setSaveStatus("idle");
    });
  }, []);

  const commit = useCallback((updater: (prev: AppPersist) => AppPersist) => {
    setSaveStatus("saving");
    setPersist((prev) => {
      const next = updater(prev);
      saveCache(next);
      queueCloudSync(next);
      return next;
    });
    if (!cloudEnabled) {
      window.setTimeout(() => setSaveStatus("saved"), 120);
      window.setTimeout(() => setSaveStatus("idle"), 1800);
    }
  }, [cloudEnabled]);

  const importLocalData = useCallback(async (): Promise<MigrationDiagnostics> => {
    const local = loadLegacyLocal();
    const stats = local ? countImportPayload(local) : null;
    const status = migrationStatusRef.current ?? (await fetchMigrationStatus());
    migrationStatusRef.current = status;
    const base = buildMigrationDiagnostics({
      cloudConfigured: cloudEnabled,
      legacyDataFound: Boolean(local),
      stats,
      status,
      recoveryMode: migrationRecoveryMode,
    });

    if (!local) {
      throw new Error("No legacy data found in localStorage (scs:v1)");
    }
    if (!cloudEnabled) {
      throw new Error("Cloud not configured — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    }

    const result = await importLocalToCloudApi(local);
    if (!result.ok) {
      const diag: MigrationDiagnostics = {
        ...base,
        lastOperation: result.operation,
        lastErrorCode: result.errorCode,
        lastErrorMessage: result.errorMessage,
      };
      throw Object.assign(new Error(result.errorMessage ?? "Import failed"), { diagnostics: diag });
    }

    // Verified in cloud — reload snapshot
    const cloud = await fetchWorkspaceSnapshotApi();
    if (cloud) {
      const seeded = SEED_PROJECTS.map((p) => mergeProject(p, cloud.overlays[p.id]));
      setPersist({
        ...cloud,
        ops: ensureOpsMigration(cloud.ops ?? emptyOpsPersist(), [...seeded, ...cloud.userProjects]),
      });
      saveCache(cloud);
    }

    const refreshed = await fetchMigrationStatus();
    migrationStatusRef.current = refreshed;

    clearLegacyLocal();
    setMigrationRecoveryMode(false);
    setShowMigrationPrompt(false);
    return {
      ...base,
      verified: result.verified,
      migrationMarkerPresent: refreshed.migrationMarkerPresent,
      cloudProjectCount: refreshed.cloudProjectCount,
      cloudDesignCount: refreshed.cloudDesignCount,
    };
  }, [cloudEnabled, migrationRecoveryMode]);

  const dismissMigration = useCallback(() => {
    // Cancel — preserve scs:v1, hide modal until next inconsistent-state detection on reload
    setShowMigrationPrompt(false);
  }, []);

  const getMigrationDiagnostics = useCallback((): MigrationDiagnostics => {
    const local = loadLegacyLocal();
    return buildMigrationDiagnostics({
      cloudConfigured: cloudEnabled,
      legacyDataFound: Boolean(local),
      stats: local ? countImportPayload(local) : null,
      status: migrationStatusRef.current,
      recoveryMode: migrationRecoveryMode,
    });
  }, [cloudEnabled, migrationRecoveryMode]);

  const refreshMigrationDiagnostics = useCallback(async (): Promise<MigrationDiagnostics> => {
    const local = loadLegacyLocal();
    const status = await fetchMigrationStatus();
    migrationStatusRef.current = status;
    const stats = local ? countImportPayload(local) : null;
    const detection = detectMigrationRecovery(
      {
        cloudConfigured: status.cloudConfigured,
        migrationMarkerPresent: status.migrationMarkerPresent,
        migrationMarkerKey: status.migrationMarkerKey,
        cloudProjectCount: status.cloudProjectCount,
        cloudDesignCount: status.cloudDesignCount,
      },
      Boolean(local),
      stats,
    );
    setMigrationRecoveryMode(detection.recoveryMode);
    return buildMigrationDiagnostics({
      cloudConfigured: cloudEnabled,
      legacyDataFound: Boolean(local),
      stats,
      status,
      recoveryMode: detection.recoveryMode,
    });
  }, [cloudEnabled]);

  const testCloudConnectionFn = useCallback(async () => {
    return testCloudConnection();
  }, []);

  const resetMigrationMarkerFn = useCallback(async () => {
    const result = await resetMigrationMarkerApi();
    if (result.ok) {
      const status = await fetchMigrationStatus();
      migrationStatusRef.current = status;
    }
    return { ok: result.ok, errorMessage: result.errorMessage };
  }, []);

  const patchOpsState = useCallback(
    (updater: (ops: OpsPersist) => OpsPersist) => {
      commit((prev) => patchOps(prev, updater));
    },
    [commit],
  );

  const logActivity = useCallback(
    (message: string, projectId?: string) => {
      const entry: Activity = {
        id: `act-${Date.now()}`,
        projectId,
        message,
        createdAt: new Date().toISOString(),
      };
      patchOpsState((ops) => ({
        ...ops,
        activities: [entry, ...ops.activities].slice(0, 200),
      }));
    },
    [patchOpsState],
  );

  const projects = useMemo(() => {
    const seeded = SEED_PROJECTS.map((project) => mergeProject(project, persist.overlays[project.id]));
    const users = persist.userProjects.map((project) => mergeProject(project, persist.overlays[project.id]));
    return [...seeded, ...users];
  }, [persist]);

  const ops = persist.ops ?? emptyOpsPersist();

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

  const appendPost = useCallback(
    (projectId: string, post: StudioPost) => {
      const project = getProject(projectId);
      if (!project) return;
      patchOverlay(projectId, (current) => {
        const data = current.posts ?? {
          order: project.posts.map((p) => p.id),
          extras: [],
          patches: {},
          deletedIds: [],
        };
        const extras = data.extras.some((item) => item.id === post.id)
          ? data.extras
          : [...data.extras, post];
        const baseOrder = data.order.length ? data.order : dedupeIds(project.posts.map((p) => p.id));
        const order = baseOrder.includes(post.id) ? baseOrder : [...baseOrder, post.id];
        return {
          ...current,
          posts: {
            ...data,
            extras,
            order: dedupeIds(order),
          },
        };
      });
    },
    [getProject, patchOverlay],
  );

  const createBlankDesign = useCallback(
    (projectId: string, title = "New design") => {
      const project = getProject(projectId);
      if (!project) return "";
      const id = `design-${Date.now()}`;
      const document = blankCanvasDocument(project.brand);
      const design = documentToDesignState(document, project.brand);
      appendPost(projectId, {
        id,
        baseId: id,
        number: String(project.posts.length + 1).padStart(2, "0"),
        title,
        exportKind: "jpg",
        durationMs: 0,
        status: "draft",
        kind: "single",
        template: "document",
        design,
        document,
      });
      logActivity(`Created blank design ${title}`, projectId);
      return id;
    },
    [getProject, appendPost, logActivity],
  );

  const createDesignFromTemplate = useCallback(
    (projectId: string, templateId: string, title?: string) => {
      const project = getProject(projectId);
      if (!project) return "";
      const template = getDesignTemplate(templateId, ops.designTemplates);
      if (!template) return "";
      const applied = applyTemplateToBrand(template, project.brand);
      const id = `design-${Date.now()}`;
      appendPost(projectId, {
        id,
        baseId: id,
        number: String(project.posts.length + 1).padStart(2, "0"),
        title: title ?? template.name,
        exportKind: applied.exportKind,
        durationMs: applied.durationMs,
        status: "draft",
        kind: "single",
        template: applied.template,
        design: applied.design,
        document: applied.document,
      });
      logActivity(`Created design from template ${template.name}`, projectId);
      return id;
    },
    [getProject, ops.designTemplates, appendPost, logActivity],
  );

  const generateDesign = useCallback(
    async (projectId: string, brief: GenerateDesignBrief) => {
      const project = getProject(projectId);
      if (!project) return "";
      const context = getProjectCreativeContext(project, ops);
      const refDocs = (brief.referencePostIds ?? [])
        .map((pid) => project.posts.find((p) => p.id === pid)?.document)
        .filter((d): d is DesignDocument => Boolean(d));
      const result = await designGenerationProvider.generateDesign(brief, context, refDocs);
      const id = `design-${Date.now()}`;
      appendPost(projectId, {
        id,
        baseId: id,
        number: String(project.posts.length + 1).padStart(2, "0"),
        title: result.title,
        exportKind: result.exportKind,
        durationMs: result.durationMs,
        status: "draft",
        kind: brief.outputKind === "carousel" ? "carousel" : "single",
        template: result.template,
        design: result.design,
        document: result.document,
        referencePostIds: brief.referencePostIds,
        slides:
          brief.outputKind === "carousel"
            ? [{ id: `${id}-1`, template: "document", title: "Slide 01", design: result.design }]
            : undefined,
      });
      logActivity(`Generated design ${result.title}`, projectId);
      return id;
    },
    [getProject, ops, appendPost, logActivity],
  );

  const updateVideoDocument = useCallback(
    (projectId: string, postId: string, video: VideoDocument) => {
      patchOverlay(projectId, (current) => ({
        ...current,
        posts: {
          ...(current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] }),
          patches: {
            ...(current.posts?.patches ?? {}),
            [postId]: {
              ...(current.posts?.patches?.[postId] ?? {}),
              video,
            },
          },
        },
      }));
    },
    [patchOverlay],
  );

  const generateStoryboard = useCallback(
    async (projectId: string, brief: GenerateStoryboardBrief, voiceId?: string) => {
      const project = getProject(projectId);
      if (!project) return { postId: "" };
      const context = getProjectCreativeContext(project, ops);

      const res = await fetch("/api/video/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, context, options: { voiceId } }),
      });
      const data = (await res.json()) as {
        video?: import("@/core/video/document").VideoDocument;
        error?: string;
        provider?: string;
        model?: string | null;
        mockReason?: string;
        fallbackFromClaude?: boolean;
        notice?: string;
      };
      if (!res.ok || !data.video) {
        throw new Error(data.error ?? "Storyboard generation failed");
      }

      const video = data.video;
      video.projectId = projectId;
      if (voiceId) {
        video.metadata.voiceId = voiceId;
      }
      if (data.model) {
        video.metadata.modelId = data.model;
      }
      if (data.provider === "mock") {
        video.metadata.generatedBy = "mock";
      }
      const withScript = applyScriptToDocument(video);
      const id = `reel-${Date.now()}`;
      appendPost(projectId, {
        id,
        baseId: id,
        number: String(project.posts.length + 1).padStart(2, "0"),
        title: withScript.title,
        exportKind: "mp4",
        durationMs: withScript.durationMs,
        status: "draft",
        kind: "reel",
        template: "video",
        design: emptyDesign(project.brand),
        video: withScript,
      });
      const providerLabel = data.fallbackFromClaude
        ? "mock (Claude credits unavailable)"
        : `${data.provider ?? "unknown"}${data.model ? ` · ${data.model}` : ""}`;
      logActivity(`Generated reel storyboard ${withScript.title} (${providerLabel})`, projectId);
      return {
        postId: id,
        notice: data.notice,
        mockReason: data.mockReason,
        fallbackFromClaude: data.fallbackFromClaude,
      };
    },
    [getProject, ops, appendPost, logActivity],
  );

  const generateVideoVoiceover = useCallback(
    async (projectId: string, postId: string) => {
      const project = getProject(projectId);
      const post = project?.posts.find((p) => p.id === postId);
      if (!post?.video) return null;
      const script = getEffectiveVoiceoverScript(post.video);
      const voiceId = post.video.metadata.voiceId ?? post.video.voiceover?.voiceId ?? "";
      if (!script.trim()) throw new Error("Voiceover script is empty");
      if (!voiceId) throw new Error("Select a voice before generating voiceover");

      const validation = validateVoiceoverScript(script);
      if (!validation.ok) {
        throw new Error(formatVoiceoverValidationError(validation));
      }

      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: script,
          voiceId,
          projectId,
          reelId: post.video.id,
        }),
      });
      const data = await parseAudioApiResponse<{
        assetUrl: string;
        assetId?: string;
        voiceId?: string;
        modelId?: string;
        characterCount?: number;
        durationMs?: number;
        metadata?: Record<string, unknown>;
      }>(res);
      const next: VideoDocument = {
        ...cloneVideoDocument(post.video),
        voiceover: {
          assetUrl: data.assetUrl,
          assetId: data.assetId,
          voiceId: data.voiceId ?? voiceId,
          modelId: data.modelId ?? "eleven_multilingual_v2",
          characterCount: data.characterCount,
          durationMs: data.durationMs,
          script: sanitizeJsonbString(script),
          costMetadata: data.metadata ? sanitizeSnapshotForJsonb(data.metadata) : undefined,
        },
      };
      updateVideoDocument(projectId, postId, next);
      return next;
    },
    [getProject, updateVideoDocument],
  );

  const generateVideoMusic = useCallback(
    async (projectId: string, postId: string, prompt: string) => {
      const project = getProject(projectId);
      const post = project?.posts.find((p) => p.id === postId);
      if (!post?.video) return null;
      if (!prompt.trim()) throw new Error("Music prompt is empty");

      const generating: VideoDocument = {
        ...cloneVideoDocument(post.video),
        music: {
          ...(post.video.music ?? { volume: 0.35 }),
          prompt: sanitizeJsonbString(prompt.trim()),
          status: "generating",
          provider: "elevenlabs",
        },
      };
      updateVideoDocument(projectId, postId, generating);

      try {
        const res = await fetch("/api/audio/music/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            durationMs: post.video.durationMs,
            projectId,
            reelId: post.video.id,
          }),
        });
        const data = await parseAudioApiResponse<{
          assetUrl: string;
          assetId?: string;
          durationMs?: number;
          provider?: string;
          model?: string;
        }>(res);

        const next: VideoDocument = {
          ...cloneVideoDocument(generating),
          music: {
            assetUrl: data.assetUrl,
            assetId: data.assetId,
            prompt: sanitizeJsonbString(prompt.trim()),
            durationMs: data.durationMs ?? post.video.durationMs,
            provider: data.provider ?? "elevenlabs",
            model: data.model ? sanitizeJsonbString(data.model) : undefined,
            status: "ready",
            volume: generating.music?.volume ?? 0.35,
          },
        };
        updateVideoDocument(projectId, postId, next);
        return next;
      } catch (err) {
        updateVideoDocument(projectId, postId, {
          ...generating,
          music: {
            ...(generating.music ?? { volume: 0.35 }),
            status: "failed",
          },
        });
        throw err;
      }
    },
    [getProject, updateVideoDocument],
  );

  const generateSceneSoundEffect = useCallback(
    async (projectId: string, postId: string, sceneId: string, prompt: string, sfxId?: string) => {
      const project = getProject(projectId);
      const post = project?.posts.find((p) => p.id === postId);
      if (!post?.video) return null;
      const scene = post.video.scenes.find((s) => s.id === sceneId);
      if (!scene) throw new Error("Scene not found");
      if (!prompt.trim()) throw new Error("Sound effect prompt is empty");

      const id = sfxId ?? uid("sfx");
      const startMs = scene.startMs;
      const durationMs = Math.min(scene.durationMs, 4000);

      const existing = post.video.soundEffects ?? [];
      const generating: VideoDocument = {
        ...cloneVideoDocument(post.video),
        soundEffects: [
          ...existing.filter((s) => s.id !== id),
          {
            id,
            sceneId,
            prompt: sanitizeJsonbString(prompt.trim()),
            startMs,
            durationMs,
            status: "generating",
            provider: "elevenlabs",
          },
        ],
      };
      updateVideoDocument(projectId, postId, generating);

      try {
        const res = await fetch("/api/audio/sfx/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            durationMs,
            projectId,
            reelId: post.video.id,
            sfxId: id,
          }),
        });
        const data = await parseAudioApiResponse<{
          assetUrl: string;
          assetId?: string;
          durationMs?: number;
          provider?: string;
          model?: string;
        }>(res);

        const next: VideoDocument = {
          ...cloneVideoDocument(generating),
          soundEffects: (generating.soundEffects ?? []).map((s) =>
            s.id === id
              ? {
                  ...s,
                  assetUrl: data.assetUrl,
                  assetId: data.assetId ?? id,
                  durationMs: data.durationMs ?? durationMs,
                  provider: data.provider ?? "elevenlabs",
                  model: data.model ? sanitizeJsonbString(data.model) : undefined,
                  status: "ready" as const,
                }
              : s,
          ),
        };
        updateVideoDocument(projectId, postId, next);
        return next;
      } catch (err) {
        updateVideoDocument(projectId, postId, {
          ...generating,
          soundEffects: (generating.soundEffects ?? []).map((s) =>
            s.id === id ? { ...s, status: "failed" as const } : s,
          ),
        });
        throw err;
      }
    },
    [getProject, updateVideoDocument],
  );

  const generateVideoCaptions = useCallback(
    async (projectId: string, postId: string) => {
      const project = getProject(projectId);
      const post = project?.posts.find((p) => p.id === postId);
      if (!post?.video) return null;
      const next = attachCaptionsToDocument(applyScriptToDocument(post.video), project!.brand);
      updateVideoDocument(projectId, postId, next);
      return next;
    },
    [getProject, updateVideoDocument],
  );

  const exportVideoMp4 = useCallback(
    async (projectId: string, postId: string) => {
      const project = getProject(projectId);
      const post = project?.posts.find((p) => p.id === postId);
      if (!post?.video) return { ok: false, errorMessage: "No video document" };
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: post.video, projectId, postId }),
      });
      return res.json() as Promise<{
        ok: boolean;
        publicUrl?: string;
        errorMessage?: string;
        requiresWorker?: boolean;
      }>;
    },
    [getProject],
  );

  const generateDesignVariations = useCallback(
    async (projectId: string, postId: string, mode: VariationMode) => {
      const project = getProject(projectId);
      if (!project) return [];
      const post = project.posts.find((p) => p.id === postId);
      if (!post?.document) return [];
      const context = getProjectCreativeContext(project, ops);
      const ids: string[] = [];
      for (let i = 0; i < 2; i += 1) {
        const doc = await designGenerationProvider.generateVariation(post.document, mode, context);
        const design = documentToDesignState(doc, project.brand);
        const id = `var-${Date.now()}-${i}`;
        appendPost(projectId, {
          id,
          baseId: post.baseId,
          number: `${post.number}${String.fromCharCode(65 + i)}`,
          title: `${post.title} · variation`,
          exportKind: post.exportKind,
          durationMs: post.durationMs,
          status: "draft",
          kind: post.kind,
          template: "document",
          design,
          document: doc,
          variantOf: post.baseId,
          variantLabel: String.fromCharCode(65 + i),
          referencePostIds: [postId],
        });
        ids.push(id);
      }
      logActivity(`Generated variations for ${post.title}`, projectId);
      return ids;
    },
    [getProject, ops, appendPost, logActivity],
  );

  const saveDesignAsTemplate = useCallback(
    (projectId: string, postId: string, name: string) => {
      const project = getProject(projectId);
      if (!project) return "";
      const post = project.posts.find((p) => p.id === postId);
      if (!post) return "";
      const template = postToTemplate(projectId, post, project.brand, name);
      patchOpsState((o) => ({
        ...o,
        designTemplates: [...o.designTemplates, template],
      }));
      logActivity(`Saved template ${name}`, projectId);
      return template.id;
    },
    [getProject, patchOpsState, logActivity],
  );

  const setDesignReferences = useCallback(
    (projectId: string, postId: string, referencePostIds: string[]) => {
      patchOverlay(projectId, (current) => ({
        ...current,
        posts: {
          ...(current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] }),
          patches: {
            ...(current.posts?.patches ?? {}),
            [postId]: {
              ...(current.posts?.patches?.[postId] ?? {}),
              referencePostIds,
            },
          },
        },
      }));
    },
    [patchOverlay],
  );

  const versionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateDocument = useCallback(
    (projectId: string, postId: string, document: DesignDocument) => {
      const project = getProject(projectId);
      if (!project) return;
      const design = documentToDesignState(document, project.brand);
      patchOverlay(projectId, (current) => ({
        ...current,
        posts: {
          ...(current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] }),
          patches: {
            ...(current.posts?.patches ?? {}),
            [postId]: {
              ...(current.posts?.patches?.[postId] ?? {}),
              document,
              design,
            },
          },
        },
      }));

      // Debounced version checkpoint (30s after last edit)
      const key = `${projectId}:${postId}`;
      if (versionTimers.current[key]) clearTimeout(versionTimers.current[key]);
      versionTimers.current[key] = setTimeout(() => {
        const client = getSupabaseClient();
        if (!client || !cloudEnabled) return;
        void createDesignVersion(client, postId, document, design, "Auto-save checkpoint");
      }, 30_000);
    },
    [getProject, patchOverlay, cloudEnabled],
  );

  const saveDesignVersion = useCallback(
    async (projectId: string, postId: string, label?: string) => {
      const project = getProject(projectId);
      const post = project?.posts.find((p) => p.id === postId);
      if (!post) return;
      const client = getSupabaseClient();
      if (!client) return;
      await createDesignVersion(
        client,
        postId,
        post.document,
        post.design,
        label ?? "Manual save",
      );
      await syncNow(persist);
    },
    [getProject, persist],
  );

  const listDesignVersionsFn = useCallback(async (postId: string) => {
    const client = getSupabaseClient();
    if (!client) return [];
    return listDesignVersions(client, postId);
  }, []);

  const restoreDesignVersion = useCallback(
    async (projectId: string, postId: string, versionId: string) => {
      const client = getSupabaseClient();
      if (!client) return;
      const { getDesignVersion } = await import("@/core/repositories/designs");
      const version = await getDesignVersion(client, versionId);
      if (!version) return;
      const project = getProject(projectId);
      if (!project) return;
      const document = version.document ?? undefined;
      const design = version.design_state as DesignState;
      patchOverlay(projectId, (current) => ({
        ...current,
        posts: {
          ...(current.posts ?? { order: [], extras: [], patches: {}, deletedIds: [] }),
          patches: {
            ...(current.posts?.patches ?? {}),
            [postId]: {
              ...(current.posts?.patches?.[postId] ?? {}),
              document,
              design,
            },
          },
        },
      }));
      if (document) {
        await createDesignVersion(client, postId, document, design, `Restored from ${version.label}`);
      }
      await syncNow(persist);
    },
    [getProject, patchOverlay, persist],
  );

  const duplicateDesignFromVersion = useCallback(
    async (projectId: string, postId: string, versionId: string) => {
      const client = getSupabaseClient();
      if (!client) return "";
      const { getDesignVersion } = await import("@/core/repositories/designs");
      const version = await getDesignVersion(client, versionId);
      const project = getProject(projectId);
      const post = project?.posts.find((p) => p.id === postId);
      if (!version || !project || !post) return "";
      const id = `design-${Date.now()}`;
      appendPost(projectId, {
        ...post,
        id,
        baseId: id,
        number: String(project.posts.length + 1).padStart(2, "0"),
        title: `${post.title} (from v${version.version_number})`,
        status: "draft",
        document: version.document ?? undefined,
        design: version.design_state as DesignState,
      });
      return id;
    },
    [getProject, appendPost],
  );

  const listProjectDesignTemplates = useCallback(
    (projectId: string) => listDesignTemplates(projectId, ops.designTemplates),
    [ops.designTemplates],
  );

  const getProjectCreativeContextFn = useCallback(
    (projectId: string) => {
      const project = getProject(projectId);
      if (!project) return null;
      return getProjectCreativeContext(project, ops);
    },
    [getProject, ops],
  );

  const createPost = useCallback(
    (projectId: string, template: string, title: string, kind: "single" | "carousel") => {
      const project = getProject(projectId);
      if (!project) return "";
      const id = `${Date.now()}`;
      const document = template === "document" ? blankCanvasDocument(project.brand) : undefined;
      const design = document
        ? documentToDesignState(document, project.brand)
        : emptyDesign(project.brand, { headline: title });
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
        document,
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
        const extras = data.extras.some((item) => item.id === id)
          ? data.extras
          : [...data.extras, extra];
        const baseOrder = data.order.length ? data.order : dedupeIds(project.posts.map((post) => post.id));
        const order = baseOrder.includes(id) ? baseOrder : [...baseOrder, id];
        return {
          ...current,
          posts: {
            ...data,
            extras,
            order: dedupeIds(order),
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

  const getOpsProject = useCallback(
    (id: string) => ops.projects.find((p) => p.id === id),
    [ops.projects],
  );

  const createOpsProject = useCallback(
    (input: {
      name: string;
      clientName: string;
      type: OpsProject["type"];
      types?: OpsProject["type"][];
      code?: string;
      color: string;
      startDate?: string;
      deadline?: string;
      description?: string;
      clientId?: string;
      owner?: string;
      status?: OpsProject["status"];
      createBrandKit?: boolean;
      formatId?: string;
      intakeDraft?: boolean;
      seedDeliverables?: string[];
    }) => {
      const studioId = createProject({
        name: input.name,
        brandName: input.clientName || input.name,
        primary: input.color,
        background: input.color,
        text: "#F1F3F7",
        accent: input.color,
        formatId: input.formatId ?? DEFAULT_FORMAT_ID,
      });
      const now = new Date().toISOString();
      let createdId = studioId;
      patchOpsState((o) => {
        const counter = input.code
          ? o.projectCodeCounter
          : o.projectCodeCounter + 1;
        const code = input.code ?? `CG-${String(counter).padStart(3, "0")}`;
        const types = input.types?.length ? input.types : [input.type];
        createdId = studioId;
        const deliverableTypeMap: Record<string, Deliverable["type"]> = {
          Logo: "logo",
          Brandbook: "brandbook",
          "Landing page": "landing",
          "Instagram feed": "post",
          "Social campaign": "campaign",
          "Pitch deck": "presentation",
          Video: "video",
          Reel: "video",
          GIF: "gif",
          Carousel: "carousel",
          Report: "report",
          Documentation: "document",
          "Product UI": "other",
          Website: "website",
          Motion: "video",
          Other: "other",
        };
        const newDeliverables = (input.seedDeliverables ?? []).map((name, i) => ({
          id: `del-seed-${studioId}-${i}`,
          projectId: studioId,
          name,
          type: deliverableTypeMap[name] ?? ("other" as const),
          status: "pending" as const,
          notes: "",
          createdAt: now,
          updatedAt: now,
        }));
        return {
          ...o,
          projectCodeCounter: input.code ? counter : counter,
          projects: [
            ...o.projects,
            {
              id: studioId,
              code,
              name: input.name,
              clientId: input.clientId,
              clientName: input.clientName,
              type: input.type,
              types,
              status: input.status ?? (input.intakeDraft ? "draft" : "active"),
              color: input.color,
              startDate: input.startDate,
              deadline: input.deadline,
              description: input.description ?? "",
              owner: input.owner,
              intakeStep: 0,
              intakeCompleted: false,
              createdAt: now,
              updatedAt: now,
            },
          ],
          intake: {
            ...o.intake,
            [studioId]: {
              ...emptyIntake(studioId),
              intakeDraft: input.intakeDraft ?? false,
              updatedAt: now,
            },
          },
          knowledge: {
            ...o.knowledge,
            [studioId]: emptyKnowledge(studioId),
          },
          deliverables: [...o.deliverables, ...newDeliverables],
        };
      });
      logActivity(`Created project ${input.name}`, studioId);
      return createdId;
    },
    [createProject, patchOpsState, logActivity],
  );

  const updateOpsProject = useCallback(
    (id: string, patch: Partial<OpsProject>) => {
      patchOpsState((o) => ({
        ...o,
        projects: o.projects.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
        ),
      }));
      if (patch.name) updateSettings(id, { name: patch.name });
      logActivity(`Updated project`, id);
    },
    [patchOpsState, updateSettings, logActivity],
  );

  const getStrategy = useCallback(
    (projectId: string) => ops.strategies[projectId] ?? emptyStrategy(projectId),
    [ops.strategies],
  );

  const updateStrategy = useCallback(
    (projectId: string, patch: Partial<ProjectStrategy>) => {
      patchOpsState((o) => ({
        ...o,
        strategies: {
          ...o.strategies,
          [projectId]: {
            ...(o.strategies[projectId] ?? emptyStrategy(projectId)),
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    },
    [patchOpsState],
  );

  const getBrandExtension = useCallback(
    (projectId: string) => ops.brandExtensions[projectId] ?? emptyBrandExtension(projectId),
    [ops.brandExtensions],
  );

  const updateBrandExtension = useCallback(
    (projectId: string, patch: Partial<BrandExtension>) => {
      patchOpsState((o) => ({
        ...o,
        brandExtensions: {
          ...o.brandExtensions,
          [projectId]: {
            ...(o.brandExtensions[projectId] ?? emptyBrandExtension(projectId)),
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    },
    [patchOpsState],
  );

  const addIdea = useCallback(
    (idea: Omit<ProjectIdea, "id" | "createdAt" | "updatedAt">) => {
      const id = `idea-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        ideas: [...o.ideas, { ...idea, id, createdAt: now, updatedAt: now }],
      }));
      logActivity(`Added idea: ${idea.title}`, idea.projectId);
      return id;
    },
    [patchOpsState, logActivity],
  );

  const updateIdea = useCallback(
    (id: string, patch: Partial<ProjectIdea>) => {
      patchOpsState((o) => ({
        ...o,
        ideas: o.ideas.map((i) =>
          i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
        ),
      }));
    },
    [patchOpsState],
  );

  const deleteIdea = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, ideas: o.ideas.filter((i) => i.id !== id) }));
    },
    [patchOpsState],
  );

  const addLink = useCallback(
    (link: Omit<ProjectLink, "id" | "createdAt">) => {
      const id = `link-${Date.now()}`;
      patchOpsState((o) => ({
        ...o,
        links: [...o.links, { ...link, id, createdAt: new Date().toISOString() }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateLink = useCallback(
    (id: string, patch: Partial<ProjectLink>) => {
      patchOpsState((o) => ({
        ...o,
        links: o.links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
    },
    [patchOpsState],
  );

  const deleteLink = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, links: o.links.filter((l) => l.id !== id) }));
    },
    [patchOpsState],
  );

  const addPhase = useCallback(
    (phase: Omit<ProjectPhase, "id" | "createdAt">) => {
      const id = `phase-${Date.now()}`;
      const created = { ...phase, id, createdAt: new Date().toISOString() };
      patchOpsState((o) => ({ ...o, phases: [...o.phases, created] }));
      if (phase.startDate) {
        patchOpsState((o) => ({
          ...o,
          calendarEvents: [
            ...o.calendarEvents,
            {
              id: `evt-${id}`,
              projectId: phase.projectId,
              title: phase.name,
              type: "phase",
              date: phase.startDate!,
              endDate: phase.endDate,
              notes: phase.notes,
              refId: id,
              refKind: "phase",
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      }
      return id;
    },
    [patchOpsState],
  );

  const updatePhase = useCallback(
    (id: string, patch: Partial<ProjectPhase>) => {
      patchOpsState((o) => ({
        ...o,
        phases: o.phases.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [patchOpsState],
  );

  const deletePhase = useCallback(
    (id: string) => {
      patchOpsState((o) => ({
        ...o,
        phases: o.phases.filter((p) => p.id !== id),
        calendarEvents: o.calendarEvents.filter((e) => e.refId !== id),
      }));
    },
    [patchOpsState],
  );

  const addDeliverable = useCallback(
    (item: Omit<Deliverable, "id" | "createdAt" | "updatedAt">) => {
      const id = `del-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        deliverables: [...o.deliverables, { ...item, id, createdAt: now, updatedAt: now }],
      }));
      if (item.deadline) {
        patchOpsState((o) => ({
          ...o,
          calendarEvents: [
            ...o.calendarEvents,
            {
              id: `evt-${id}`,
              projectId: item.projectId,
              title: item.name,
              type: "deliverable",
              date: item.deadline!,
              notes: item.notes,
              refId: id,
              refKind: "deliverable",
              createdAt: now,
            },
          ],
        }));
      }
      return id;
    },
    [patchOpsState],
  );

  const updateDeliverable = useCallback(
    (id: string, patch: Partial<Deliverable>) => {
      patchOpsState((o) => ({
        ...o,
        deliverables: o.deliverables.map((d) =>
          d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
        ),
      }));
    },
    [patchOpsState],
  );

  const deleteDeliverable = useCallback(
    (id: string) => {
      patchOpsState((o) => ({
        ...o,
        deliverables: o.deliverables.filter((d) => d.id !== id),
        calendarEvents: o.calendarEvents.filter((e) => e.refId !== id),
      }));
    },
    [patchOpsState],
  );

  const addContentItem = useCallback(
    (item: Omit<ContentItem, "id" | "createdAt" | "updatedAt">) => {
      const id = `cnt-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        contentItems: [...o.contentItems, { ...item, id, createdAt: now, updatedAt: now }],
      }));
      if (item.publicationDate) {
        patchOpsState((o) => ({
          ...o,
          calendarEvents: [
            ...o.calendarEvents,
            {
              id: `evt-${id}`,
              projectId: item.projectId,
              title: item.title,
              type: "content",
              date: item.publicationDate!,
              notes: item.notes,
              refId: id,
              refKind: "content",
              createdAt: now,
            },
          ],
        }));
      }
      return id;
    },
    [patchOpsState],
  );

  const updateContentItem = useCallback(
    (id: string, patch: Partial<ContentItem>) => {
      patchOpsState((o) => ({
        ...o,
        contentItems: o.contentItems.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
        ),
      }));
    },
    [patchOpsState],
  );

  const deleteContentItem = useCallback(
    (id: string) => {
      patchOpsState((o) => ({
        ...o,
        contentItems: o.contentItems.filter((c) => c.id !== id),
        calendarEvents: o.calendarEvents.filter((e) => e.refId !== id),
      }));
    },
    [patchOpsState],
  );

  const createDesignFromContent = useCallback(
    (contentId: string) => {
      const item = ops.contentItems.find((c) => c.id === contentId);
      if (!item) return null;
      const postId = createPost(item.projectId, "brand-intro", item.title, "single");
      updateContentItem(contentId, { relatedPostId: postId, status: "design" });
      logActivity(`Created design from content: ${item.title}`, item.projectId);
      return postId;
    },
    [ops.contentItems, createPost, updateContentItem, logActivity],
  );

  const addCampaign = useCallback(
    (campaign: Omit<Campaign, "id" | "createdAt">) => {
      const id = `camp-${Date.now()}`;
      patchOpsState((o) => ({
        ...o,
        campaigns: [...o.campaigns, { ...campaign, id, createdAt: new Date().toISOString() }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateCampaign = useCallback(
    (id: string, patch: Partial<Campaign>) => {
      patchOpsState((o) => ({
        ...o,
        campaigns: o.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    [patchOpsState],
  );

  const addClient = useCallback(
    (client: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
      const id = `client-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        clients: [...o.clients, { ...client, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateClient = useCallback(
    (id: string, patch: Partial<Client>) => {
      patchOpsState((o) => ({
        ...o,
        clients: o.clients.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
        ),
      }));
    },
    [patchOpsState],
  );

  const deleteClient = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, clients: o.clients.filter((c) => c.id !== id) }));
    },
    [patchOpsState],
  );

  const addProposal = useCallback(
    (proposal: Omit<Proposal, "id" | "createdAt" | "updatedAt">) => {
      const id = `prop-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        proposals: [...o.proposals, { ...proposal, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateProposal = useCallback(
    (id: string, patch: Partial<Proposal>) => {
      patchOpsState((o) => ({
        ...o,
        proposals: o.proposals.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
        ),
      }));
    },
    [patchOpsState],
  );

  const createProjectFromProposal = useCallback(
    (proposalId: string) => {
      const proposal = ops.proposals.find((p) => p.id === proposalId);
      if (!proposal) return null;
      const projectId = createOpsProject({
        name: proposal.title,
        clientName: proposal.clientName,
        clientId: proposal.clientId,
        type: proposal.projectType,
        color: "#149A9B",
        description: proposal.notes,
      });
      updateProposal(proposalId, { status: "accepted" });
      return projectId;
    },
    [ops.proposals, createOpsProject, updateProposal],
  );

  const addInspiration = useCallback(
    (item: Omit<Inspiration, "id" | "createdAt">) => {
      const id = `insp-${Date.now()}`;
      patchOpsState((o) => ({
        ...o,
        inspirations: [...o.inspirations, { ...item, id, createdAt: new Date().toISOString() }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateInspiration = useCallback(
    (id: string, patch: Partial<Inspiration>) => {
      patchOpsState((o) => ({
        ...o,
        inspirations: o.inspirations.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }));
    },
    [patchOpsState],
  );

  const deleteInspiration = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, inspirations: o.inspirations.filter((i) => i.id !== id) }));
    },
    [patchOpsState],
  );

  const setIdeaMap = useCallback(
    (nodes: IdeaNode[], edges: IdeaEdge[]) => {
      patchOpsState((o) => ({ ...o, ideaNodes: nodes, ideaEdges: edges }));
    },
    [patchOpsState],
  );

  const addCalendarEvent = useCallback(
    (event: Omit<CalendarEvent, "id" | "createdAt">) => {
      const id = `evt-${Date.now()}`;
      patchOpsState((o) => ({
        ...o,
        calendarEvents: [...o.calendarEvents, { ...event, id, createdAt: new Date().toISOString() }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateCalendarEvent = useCallback(
    (id: string, patch: Partial<CalendarEvent>) => {
      patchOpsState((o) => ({
        ...o,
        calendarEvents: o.calendarEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [patchOpsState],
  );

  const deleteCalendarEvent = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, calendarEvents: o.calendarEvents.filter((e) => e.id !== id) }));
    },
    [patchOpsState],
  );

  const allPosts = useCallback(
    () =>
      projects.flatMap((project) =>
        project.posts.map((post) => ({ project, post })),
      ),
    [projects],
  );

  const getIntake = useCallback(
    (projectId: string) => ops.intake[projectId] ?? emptyIntake(projectId),
    [ops.intake],
  );

  const updateIntake = useCallback(
    (projectId: string, patch: Partial<ProjectIntake>) => {
      patchOpsState((o) => ({
        ...o,
        intake: {
          ...o.intake,
          [projectId]: {
            ...(o.intake[projectId] ?? emptyIntake(projectId)),
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    },
    [patchOpsState],
  );

  const getKnowledge = useCallback(
    (projectId: string) => ops.knowledge[projectId] ?? emptyKnowledge(projectId),
    [ops.knowledge],
  );

  const updateKnowledge = useCallback(
    (projectId: string, patch: Partial<ReturnType<typeof emptyKnowledge>>) => {
      patchOpsState((o) => ({
        ...o,
        knowledge: {
          ...o.knowledge,
          [projectId]: {
            ...(o.knowledge[projectId] ?? emptyKnowledge(projectId)),
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    },
    [patchOpsState],
  );

  const addSource = useCallback(
    (source: Omit<ProjectSource, "id" | "createdAt" | "updatedAt" | "dateAdded">) => {
      const id = `src-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        sources: [...o.sources, { ...source, id, dateAdded: now, createdAt: now, updatedAt: now }],
      }));
      logActivity(`Added source: ${source.title}`, source.projectId);
      return id;
    },
    [patchOpsState, logActivity],
  );

  const updateSource = useCallback(
    (id: string, patch: Partial<ProjectSource>) => {
      patchOpsState((o) => ({
        ...o,
        sources: o.sources.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
        ),
      }));
    },
    [patchOpsState],
  );

  const deleteSource = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, sources: o.sources.filter((s) => s.id !== id) }));
    },
    [patchOpsState],
  );

  const getSource = useCallback(
    (id: string) => ops.sources.find((s) => s.id === id),
    [ops.sources],
  );

  const addReference = useCallback(
    (ref: Omit<ProjectReference, "id" | "createdAt" | "updatedAt">) => {
      const id = `ref-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        references: [...o.references, { ...ref, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateReference = useCallback(
    (id: string, patch: Partial<ProjectReference>) => {
      patchOpsState((o) => ({
        ...o,
        references: o.references.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
        ),
      }));
    },
    [patchOpsState],
  );

  const deleteReference = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, references: o.references.filter((r) => r.id !== id) }));
    },
    [patchOpsState],
  );

  const addReferenceBoard = useCallback(
    (board: Omit<ReferenceBoard, "id" | "createdAt">) => {
      const id = `board-${Date.now()}`;
      patchOpsState((o) => ({
        ...o,
        referenceBoards: [...o.referenceBoards, { ...board, id, createdAt: new Date().toISOString() }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateReferenceBoard = useCallback(
    (id: string, patch: Partial<ReferenceBoard>) => {
      patchOpsState((o) => ({
        ...o,
        referenceBoards: o.referenceBoards.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      }));
    },
    [patchOpsState],
  );

  const deleteReferenceBoard = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, referenceBoards: o.referenceBoards.filter((b) => b.id !== id) }));
    },
    [patchOpsState],
  );

  const addDecision = useCallback(
    (decision: Omit<ProjectDecision, "id" | "createdAt" | "updatedAt">) => {
      const id = `dec-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        decisions: [...o.decisions, { ...decision, id, createdAt: now, updatedAt: now }],
      }));
      logActivity(`Decision: ${decision.decision.slice(0, 60)}`, decision.projectId);
      return id;
    },
    [patchOpsState, logActivity],
  );

  const updateDecision = useCallback(
    (id: string, patch: Partial<ProjectDecision>) => {
      patchOpsState((o) => ({
        ...o,
        decisions: o.decisions.map((d) =>
          d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
        ),
      }));
    },
    [patchOpsState],
  );

  const deleteDecision = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, decisions: o.decisions.filter((d) => d.id !== id) }));
    },
    [patchOpsState],
  );

  const addCompetitor = useCallback(
    (item: Omit<CompetitorBenchmark, "id" | "createdAt" | "updatedAt">) => {
      const id = `cmp-${Date.now()}`;
      const now = new Date().toISOString();
      patchOpsState((o) => ({
        ...o,
        competitors: [...o.competitors, { ...item, id, createdAt: now, updatedAt: now }],
      }));
      return id;
    },
    [patchOpsState],
  );

  const updateCompetitor = useCallback(
    (id: string, patch: Partial<CompetitorBenchmark>) => {
      patchOpsState((o) => ({
        ...o,
        competitors: o.competitors.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
        ),
      }));
    },
    [patchOpsState],
  );

  const deleteCompetitor = useCallback(
    (id: string) => {
      patchOpsState((o) => ({ ...o, competitors: o.competitors.filter((c) => c.id !== id) }));
    },
    [patchOpsState],
  );

  const getProjectContextFn = useCallback(
    (projectId: string) => getProjectContext(ops, projectId, getProject(projectId)),
    [ops, getProject],
  );

  const previewProjectCode = useCallback(() => nextProjectCode(ops), [ops]);

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
      createBlankDesign,
      createDesignFromTemplate,
      generateDesign,
      generateStoryboard,
      updateVideoDocument,
      generateVideoVoiceover,
      generateVideoMusic,
      generateSceneSoundEffect,
      generateVideoCaptions,
      exportVideoMp4,
      generateDesignVariations,
      saveDesignAsTemplate,
      setDesignReferences,
      updateDocument,
      saveDesignVersion,
      listDesignVersions: listDesignVersionsFn,
      restoreDesignVersion,
      duplicateDesignFromVersion,
      listProjectDesignTemplates,
      getProjectCreativeContext: getProjectCreativeContextFn,
      deletePost,
      resetDesign,
      resetProject,
      importProject,
      ops,
      saveStatus,
      syncStatus,
      cloudEnabled,
      showMigrationPrompt,
      migrationRecoveryMode,
      importLocalData,
      dismissMigration,
      getMigrationDiagnostics,
      refreshMigrationDiagnostics,
      testCloudConnection: testCloudConnectionFn,
      resetMigrationMarker: resetMigrationMarkerFn,
      getOpsProject,
      createOpsProject,
      updateOpsProject,
      logActivity,
      getStrategy,
      updateStrategy,
      getBrandExtension,
      updateBrandExtension,
      addIdea,
      updateIdea,
      deleteIdea,
      addLink,
      updateLink,
      deleteLink,
      addPhase,
      updatePhase,
      deletePhase,
      addDeliverable,
      updateDeliverable,
      deleteDeliverable,
      addContentItem,
      updateContentItem,
      deleteContentItem,
      createDesignFromContent,
      addCampaign,
      updateCampaign,
      addClient,
      updateClient,
      deleteClient,
      addProposal,
      updateProposal,
      createProjectFromProposal,
      addInspiration,
      updateInspiration,
      deleteInspiration,
      setIdeaMap,
      addCalendarEvent,
      updateCalendarEvent,
      deleteCalendarEvent,
      allPosts,
      getIntake,
      updateIntake,
      getKnowledge,
      updateKnowledge,
      addSource,
      updateSource,
      deleteSource,
      getSource,
      addReference,
      updateReference,
      deleteReference,
      addReferenceBoard,
      updateReferenceBoard,
      deleteReferenceBoard,
      addDecision,
      updateDecision,
      deleteDecision,
      addCompetitor,
      updateCompetitor,
      deleteCompetitor,
      getProjectContext: getProjectContextFn,
      previewProjectCode,
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
      createBlankDesign,
      createDesignFromTemplate,
      generateDesign,
      generateStoryboard,
      updateVideoDocument,
      generateVideoVoiceover,
      generateVideoMusic,
      generateSceneSoundEffect,
      generateVideoCaptions,
      exportVideoMp4,
      generateDesignVariations,
      saveDesignAsTemplate,
      setDesignReferences,
      updateDocument,
      saveDesignVersion,
      listDesignVersionsFn,
      restoreDesignVersion,
      duplicateDesignFromVersion,
      listProjectDesignTemplates,
      getProjectCreativeContextFn,
      deletePost,
      resetDesign,
      resetProject,
      importProject,
      ops,
      saveStatus,
      syncStatus,
      cloudEnabled,
      showMigrationPrompt,
      migrationRecoveryMode,
      importLocalData,
      dismissMigration,
      getMigrationDiagnostics,
      refreshMigrationDiagnostics,
      testCloudConnectionFn,
      resetMigrationMarkerFn,
      getOpsProject,
      createOpsProject,
      updateOpsProject,
      logActivity,
      getStrategy,
      updateStrategy,
      getBrandExtension,
      updateBrandExtension,
      addIdea,
      updateIdea,
      deleteIdea,
      addLink,
      updateLink,
      deleteLink,
      addPhase,
      updatePhase,
      deletePhase,
      addDeliverable,
      updateDeliverable,
      deleteDeliverable,
      addContentItem,
      updateContentItem,
      deleteContentItem,
      createDesignFromContent,
      addCampaign,
      updateCampaign,
      addClient,
      updateClient,
      deleteClient,
      addProposal,
      updateProposal,
      createProjectFromProposal,
      addInspiration,
      updateInspiration,
      deleteInspiration,
      setIdeaMap,
      addCalendarEvent,
      updateCalendarEvent,
      deleteCalendarEvent,
      allPosts,
      getIntake,
      updateIntake,
      getKnowledge,
      updateKnowledge,
      addSource,
      updateSource,
      deleteSource,
      getSource,
      addReference,
      updateReference,
      deleteReference,
      addReferenceBoard,
      updateReferenceBoard,
      deleteReferenceBoard,
      addDecision,
      updateDecision,
      deleteDecision,
      addCompetitor,
      updateCompetitor,
      deleteCompetitor,
      getProjectContextFn,
      previewProjectCode,
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
