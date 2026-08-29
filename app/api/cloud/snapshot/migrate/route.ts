import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AppPersist } from "@/core/types";
import {
  migrateWorkspaceSnapshot,
  snapshotByteSize,
  snapshotCounts,
  isValidPersistSnapshot,
} from "@/core/repositories/workspace-snapshot";
import { CloudSyncError } from "@/core/repositories/supabase-errors";

export const runtime = "nodejs";

export type SnapshotMigrateResponse = {
  success: boolean;
  projects: number;
  designs: number;
  campaigns: number;
  templates: number;
  bytesStored: number;
  verified?: boolean;
  operation?: string;
  errorMessage?: string;
};

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        projects: 0,
        designs: 0,
        campaigns: 0,
        templates: 0,
        bytesStored: 0,
        operation: "getSupabaseAdmin",
        errorMessage: "Admin client unavailable",
      } satisfies SnapshotMigrateResponse,
      { status: 503 },
    );
  }

  let body: { persist?: AppPersist; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        projects: 0,
        designs: 0,
        campaigns: 0,
        templates: 0,
        bytesStored: 0,
        errorMessage: "Invalid JSON body",
      } satisfies SnapshotMigrateResponse,
      { status: 400 },
    );
  }

  const persist = body.persist;
  if (!persist || !isValidPersistSnapshot(persist)) {
    return NextResponse.json(
      {
        success: false,
        projects: 0,
        designs: 0,
        campaigns: 0,
        templates: 0,
        bytesStored: 0,
        errorMessage: "Missing or invalid persist payload (expected version 2)",
      } satisfies SnapshotMigrateResponse,
      { status: 400 },
    );
  }

  const expected = snapshotCounts(persist);
  const bytesStored = snapshotByteSize(persist);

  try {
    const result = await migrateWorkspaceSnapshot(admin, persist);
    return NextResponse.json({
      success: result.success,
      projects: expected.projects,
      designs: expected.designs,
      campaigns: expected.campaigns,
      templates: expected.templates,
      bytesStored,
      verified: result.ok,
    } satisfies SnapshotMigrateResponse);
  } catch (err) {
    if (err instanceof CloudSyncError) {
      return NextResponse.json(
        {
          success: false,
          projects: expected.projects,
          designs: expected.designs,
          campaigns: expected.campaigns,
          templates: expected.templates,
          bytesStored,
          operation: err.operation,
          errorMessage: err.details,
        } satisfies SnapshotMigrateResponse,
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        projects: expected.projects,
        designs: expected.designs,
        campaigns: expected.campaigns,
        templates: expected.templates,
        bytesStored,
        errorMessage: err instanceof Error ? err.message : "Migration failed",
      } satisfies SnapshotMigrateResponse,
      { status: 500 },
    );
  }
}
