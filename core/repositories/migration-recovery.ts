import type { ImportStats } from "@/core/repositories/import-stats";

/** Supabase `workspace_meta.key` — marks local → cloud migration as completed. */
export const MIGRATION_MARKER_KEY = "local_migration_completed";

export type MigrationCloudStatus = {
  cloudConfigured: boolean;
  migrationMarkerPresent: boolean;
  migrationMarkerKey: string;
  cloudProjectCount: number;
  cloudDesignCount: number;
};

export function cloudDataIncomplete(
  status: MigrationCloudStatus,
  expected: Pick<ImportStats, "projectCount" | "designCount"> | null,
): boolean {
  if (status.cloudProjectCount === 0) return true;
  if (!expected) return false;
  if (expected.projectCount > 0 && status.cloudProjectCount < expected.projectCount) return true;
  if (expected.designCount > 0 && status.cloudDesignCount < expected.designCount) return true;
  return false;
}

/** When to show the migration / recovery modal. */
export function detectMigrationRecovery(
  status: MigrationCloudStatus,
  legacyDataFound: boolean,
  expected: Pick<ImportStats, "projectCount" | "designCount"> | null,
): { showModal: boolean; recoveryMode: boolean } {
  if (!status.cloudConfigured || !legacyDataFound) {
    return { showModal: false, recoveryMode: false };
  }

  if (!cloudDataIncomplete(status, expected)) {
    return { showModal: false, recoveryMode: false };
  }

  if (status.migrationMarkerPresent) {
    return { showModal: true, recoveryMode: true };
  }

  return { showModal: true, recoveryMode: false };
}
