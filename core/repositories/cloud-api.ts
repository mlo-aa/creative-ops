import type { AppPersist } from "@/core/types";
import type { ImportStats } from "@/core/repositories/import-stats";
import type { CloudTestResult } from "@/app/api/cloud/test/route";
import type { MigrationStatusResult } from "@/app/api/cloud/migration-status/route";
import type { SnapshotMigrateResponse } from "@/app/api/cloud/snapshot/migrate/route";
import { MIGRATION_MARKER_KEY } from "@/core/repositories/migration-recovery";

export type MigrationDiagnostics = {
  cloudConfigured: boolean;
  legacyDataFound: boolean;
  legacyKey: string;
  migrationMarkerPresent?: boolean;
  migrationMarkerKey: string;
  cloudProjectCount?: number;
  cloudDesignCount?: number;
  recoveryMode?: boolean;
  stats: ImportStats | null;
  verified?: { projectCount: number; designCount: number };
  lastOperation?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  cloudTest?: CloudTestResult;
};

export async function fetchMigrationStatus(): Promise<MigrationStatusResult> {
  const res = await fetch("/api/cloud/migration-status");
  return res.json() as Promise<MigrationStatusResult>;
}

export async function testCloudConnection(): Promise<CloudTestResult> {
  const res = await fetch("/api/cloud/test");
  return res.json() as Promise<CloudTestResult>;
}

export async function importLocalToCloudApi(persist: AppPersist): Promise<{
  ok: boolean;
  stats?: ImportStats;
  verified?: { projectCount: number; designCount: number };
  operation?: string;
  errorCode?: string;
  errorMessage?: string;
}> {
  const res = await fetch("/api/cloud/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persist }),
  });
  return res.json();
}

export async function resetMigrationMarkerApi(): Promise<{
  ok: boolean;
  migrationMarkerKey?: string;
  operation?: string;
  errorCode?: string;
  errorMessage?: string;
}> {
  const res = await fetch("/api/cloud/reset-migration-marker", { method: "POST" });
  return res.json();
}

export async function syncToCloudApi(persist: AppPersist): Promise<{
  ok: boolean;
  operation?: string;
  errorCode?: string;
  errorMessage?: string;
}> {
  const res = await fetch("/api/cloud/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persist }),
  });
  return res.json();
}

/** Load workspace snapshot from Supabase (`workspace_snapshots/main`). */
export async function fetchWorkspaceSnapshotApi(): Promise<AppPersist | null> {
  try {
    const res = await fetch("/api/cloud/snapshot");
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as { persist?: AppPersist };
    return data.persist ?? null;
  } catch {
    return null;
  }
}

/** Upload full workspace JSON snapshot — no ID transforms. */
export async function migrateSnapshotToCloudApi(persist: AppPersist): Promise<SnapshotMigrateResponse> {
  const res = await fetch("/api/cloud/snapshot/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persist }),
  });
  return res.json();
}

export function buildMigrationDiagnostics(input: {
  cloudConfigured: boolean;
  legacyDataFound: boolean;
  stats: ImportStats | null;
  status?: MigrationStatusResult | null;
  recoveryMode?: boolean;
}): MigrationDiagnostics {
  return {
    cloudConfigured: input.cloudConfigured,
    legacyDataFound: input.legacyDataFound,
    legacyKey: "scs:v1",
    migrationMarkerKey: MIGRATION_MARKER_KEY,
    migrationMarkerPresent: input.status?.migrationMarkerPresent,
    cloudProjectCount: input.status?.cloudProjectCount,
    cloudDesignCount: input.status?.cloudDesignCount,
    recoveryMode: input.recoveryMode,
    stats: input.stats,
  };
}
