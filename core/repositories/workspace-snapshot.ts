/**
 * Snapshot-based workspace persistence — single JSON blob in Supabase.
 * Bypasses normalized tables for main read/write path.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppPersist } from "@/core/types";
import { countImportPayload } from "@/core/repositories/import-stats";
import { assertNoError } from "@/core/repositories/supabase-errors";

export const WORKSPACE_SNAPSHOT_ID = "main";

export type SnapshotCounts = {
  projects: number;
  designs: number;
  campaigns: number;
  templates: number;
};

export type SnapshotSaveResult = {
  bytesStored: number;
  counts: SnapshotCounts;
};

export type SnapshotVerifyResult = {
  ok: boolean;
  counts: SnapshotCounts;
  storedCounts: SnapshotCounts;
  bytesStored: number;
};

export function snapshotCounts(persist: AppPersist): SnapshotCounts {
  const stats = countImportPayload(persist);
  return {
    projects: stats.projectCount,
    designs: stats.designCount,
    campaigns: stats.campaignCount,
    templates: stats.templateCount,
  };
}

export function snapshotByteSize(persist: AppPersist): number {
  return Buffer.byteLength(JSON.stringify(persist), "utf8");
}

export function isValidPersistSnapshot(data: unknown): data is AppPersist {
  if (!data || typeof data !== "object") return false;
  const p = data as AppPersist;
  return p.version === 2 && Array.isArray(p.userProjects) && typeof p.overlays === "object";
}

export async function loadWorkspaceSnapshot(client: SupabaseClient): Promise<AppPersist | null> {
  const { data, error } = await client
    .from("workspace_snapshots")
    .select("data")
    .eq("id", WORKSPACE_SNAPSHOT_ID)
    .maybeSingle();

  assertNoError("workspace_snapshots.load", error);
  if (!data?.data || !isValidPersistSnapshot(data.data)) return null;
  return data.data;
}

export async function saveWorkspaceSnapshot(
  client: SupabaseClient,
  persist: AppPersist,
): Promise<SnapshotSaveResult> {
  const bytesStored = snapshotByteSize(persist);
  const counts = snapshotCounts(persist);

  const { error } = await client.from("workspace_snapshots").upsert({
    id: WORKSPACE_SNAPSHOT_ID,
    data: persist,
    updated_at: new Date().toISOString(),
  });

  assertNoError("workspace_snapshots.upsert", error);
  return { bytesStored, counts };
}

export async function verifyWorkspaceSnapshot(
  client: SupabaseClient,
  expected: AppPersist,
): Promise<SnapshotVerifyResult> {
  const stored = await loadWorkspaceSnapshot(client);
  if (!stored) {
    return {
      ok: false,
      counts: snapshotCounts(expected),
      storedCounts: { projects: 0, designs: 0, campaigns: 0, templates: 0 },
      bytesStored: 0,
    };
  }

  const counts = snapshotCounts(expected);
  const storedCounts = snapshotCounts(stored);
  const ok =
    storedCounts.projects === counts.projects &&
    storedCounts.designs === counts.designs &&
    storedCounts.campaigns === counts.campaigns &&
    storedCounts.templates === counts.templates;

  return {
    ok,
    counts,
    storedCounts,
    bytesStored: snapshotByteSize(stored),
  };
}

/** Upload snapshot and verify core counts match. */
export async function migrateWorkspaceSnapshot(
  client: SupabaseClient,
  persist: AppPersist,
): Promise<SnapshotVerifyResult & { success: boolean }> {
  await saveWorkspaceSnapshot(client, persist);
  const verified = await verifyWorkspaceSnapshot(client, persist);
  return { success: verified.ok, ...verified };
}
