/** Local emergency cache — not authoritative when cloud is configured. */

import type { AppPersist } from "@/core/types";

export const CACHE_KEY = "scs:cache:v1";
export const LEGACY_KEY = "scs:v1";

export function loadCache(): AppPersist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppPersist;
  } catch {
    return null;
  }
}

export function saveCache(persist: AppPersist): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(persist));
  } catch {
    /* quota */
  }
}

export function loadLegacyLocal(): AppPersist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppPersist;
  } catch {
    return null;
  }
}

export function clearLegacyLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function hasLegacyLocalData(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(LEGACY_KEY));
}

export type SyncStatus = "idle" | "saving" | "saved" | "offline" | "unsynced";
