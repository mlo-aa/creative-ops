import type { AppPersist } from "@/core/types";
import { emptyOpsPersist, type OpsPersist } from "@/core/ops/types";

/** @deprecated Use loadCache() — legacy localStorage key kept for migration only. */
export const STORAGE_KEY = "scs:v1";

export function loadPersist(): AppPersist {
  if (typeof window === "undefined") return emptyPersist();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPersist();
    const parsed = JSON.parse(raw) as Partial<AppPersist> & { version?: number };
    if (parsed.version === 2) {
      const ops = parsed.ops ?? emptyOpsPersist();
      return {
        version: 2,
        userProjects: parsed.userProjects ?? [],
        overlays: parsed.overlays ?? {},
        ops: {
          ...emptyOpsPersist(),
          ...ops,
          sources: ops.sources ?? [],
          references: ops.references ?? [],
          referenceBoards: ops.referenceBoards ?? [],
          decisions: ops.decisions ?? [],
          knowledge: ops.knowledge ?? {},
          intake: ops.intake ?? {},
          competitors: ops.competitors ?? [],
          designTemplates: ops.designTemplates ?? [],
          projects: (ops.projects ?? []).map((p) => ({
            ...p,
            types: p.types?.length ? p.types : [p.type],
          })),
        },
      };
    }
    if (parsed.version === 1) {
      return migrateV1ToV2(parsed as unknown as AppPersistV1);
    }
    return emptyPersist();
  } catch {
    return emptyPersist();
  }
}

export function savePersist(next: AppPersist) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full */
  }
}

type AppPersistV1 = {
  version: 1;
  userProjects: AppPersist["userProjects"];
  overlays: AppPersist["overlays"];
};

function emptyPersist(): AppPersist {
  return { version: 2, userProjects: [], overlays: {}, ops: emptyOpsPersist() };
}

function migrateV1ToV2(v1: AppPersistV1): AppPersist {
  return {
    version: 2,
    userProjects: v1.userProjects ?? [],
    overlays: v1.overlays ?? {},
    ops: emptyOpsPersist(),
  };
}

export function patchOps(
  persist: AppPersist,
  updater: (ops: OpsPersist) => OpsPersist,
): AppPersist {
  return { ...persist, ops: updater(persist.ops ?? emptyOpsPersist()) };
}
