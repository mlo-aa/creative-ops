import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AppPersist } from "@/core/types";
import { saveCache, type SyncStatus } from "@/core/repository/cache";
import { importLocalToCloudApi, syncToCloudApi } from "@/core/repositories/cloud-api";
import { diagnoseSnapshotForJsonb } from "@/core/repositories/jsonb-sanitize";

type SyncListener = (status: SyncStatus) => void;

let pending: AppPersist | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let offline = false;
let listeners: SyncListener[] = [];
const DEBOUNCE_MS = 1200;

export function subscribeSyncStatus(fn: SyncListener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function notify(status: SyncStatus) {
  for (const fn of listeners) fn(status);
}

export function queueCloudSync(persist: AppPersist): void {
  saveCache(persist);
  if (!isSupabaseConfigured()) return;

  pending = persist;
  notify("saving");

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushCloudSync();
  }, DEBOUNCE_MS);
}

export async function flushCloudSync(): Promise<boolean> {
  if (!pending || !isSupabaseConfigured()) return true;

  const snapshot = pending;
  syncing = true;
  notify("saving");

  try {
    diagnoseSnapshotForJsonb(snapshot, "cloud-sync.pre-upsert");
    const result = await syncToCloudApi(snapshot);
    if (!result.ok) {
      throw new Error(
        result.errorMessage
          ? `${result.operation ?? "cloud.sync"}: ${result.errorMessage}`
          : "Cloud sync failed",
      );
    }
    offline = false;
    if (pending === snapshot) pending = null;
    notify("saved");
    setTimeout(() => notify("idle"), 1500);
    return true;
  } catch (err) {
    console.error("[cloud-sync] failed", err);
    offline = true;
    notify("unsynced");
    return false;
  } finally {
    syncing = false;
  }
}

export function isCloudOffline(): boolean {
  return offline;
}

export function isCloudSyncing(): boolean {
  return syncing;
}

/** Immediate sync — use for explicit saves / version checkpoints. */
export async function syncNow(persist: AppPersist): Promise<boolean> {
  pending = persist;
  if (timer) clearTimeout(timer);
  return flushCloudSync();
}

export function cloudPersistenceEnabled(): boolean {
  return isSupabaseConfigured();
}
