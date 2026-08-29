import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { loadWorkspaceMeta, getCloudRecordCounts } from "@/core/repositories/workspace";
import { MIGRATION_MARKER_KEY } from "@/core/repositories/migration-recovery";

export const runtime = "nodejs";

export type MigrationStatusResult = {
  cloudConfigured: boolean;
  migrationMarkerPresent: boolean;
  migrationMarkerKey: string;
  cloudProjectCount: number;
  cloudDesignCount: number;
  cloudTemplateCount: number;
  cloudCampaignCount: number;
  operation?: string;
  errorCode?: string;
  errorMessage?: string;
};

export async function GET() {
  const base: MigrationStatusResult = {
    cloudConfigured: isSupabaseConfigured(),
    migrationMarkerPresent: false,
    migrationMarkerKey: MIGRATION_MARKER_KEY,
    cloudProjectCount: 0,
    cloudDesignCount: 0,
    cloudTemplateCount: 0,
    cloudCampaignCount: 0,
  };

  if (!base.cloudConfigured) {
    return NextResponse.json(base);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({
      ...base,
      operation: "getSupabaseAdmin",
      errorMessage: "Server admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY in .env.local",
    });
  }

  try {
    const meta = await loadWorkspaceMeta(admin);
    const counts = await getCloudRecordCounts(admin);

    return NextResponse.json({
      ...base,
      migrationMarkerPresent: meta.localMigrationCompleted,
      cloudProjectCount: counts.projectCount,
      cloudDesignCount: counts.designCount,
      cloudTemplateCount: counts.templateCount,
      cloudCampaignCount: counts.campaignCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read migration status";
    return NextResponse.json({
      ...base,
      operation: "migration-status",
      errorMessage: message,
    });
  }
}
