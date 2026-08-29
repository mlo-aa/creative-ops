import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AppPersist } from "@/core/types";
import { countImportPayload } from "@/core/repositories/import-stats";
import {
  importLocalToCloud,
  getLastUpsertFilterDiagnostics,
} from "@/core/repositories/workspace";
import { CloudSyncError, LiveSchemaMismatchError } from "@/core/repositories/supabase-errors";
import type { UpsertFilterDiagnostics } from "@/core/repositories/live-schema";

export const runtime = "nodejs";

export type SchemaFailureDiagnostics = UpsertFilterDiagnostics;

export type CloudImportResponse = {
  success: boolean;
  ok?: boolean;
  source?: string;
  expectedProjects: number;
  cloudProjects: number;
  expectedDesigns: number;
  cloudDesigns: number;
  operation?: string;
  errorCode?: string;
  errorMessage?: string;
  stats?: ReturnType<typeof countImportPayload>;
  /** @deprecated Use schemaDiagnostics */
  liveProjectColumns?: string[];
  /** @deprecated Use schemaDiagnostics */
  projectUpsertKeys?: string[];
  schemaDiagnostics?: SchemaFailureDiagnostics;
};

function diagnosticsPayload(): Partial<CloudImportResponse> {
  const d = getLastUpsertFilterDiagnostics();
  if (!d) return {};
  return {
    schemaDiagnostics: d,
    liveProjectColumns: d.table === "projects" ? d.liveColumns : undefined,
    projectUpsertKeys: d.table === "projects" ? d.filteredKeys : undefined,
  };
}

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        ok: false,
        expectedProjects: 0,
        cloudProjects: 0,
        expectedDesigns: 0,
        cloudDesigns: 0,
        operation: "getSupabaseAdmin",
        errorMessage: "Server admin client unavailable — SUPABASE_SERVICE_ROLE_KEY missing or invalid",
      } satisfies CloudImportResponse,
      { status: 503 },
    );
  }

  let body: { persist?: AppPersist; source?: string; setMigrationMarker?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        ok: false,
        expectedProjects: 0,
        cloudProjects: 0,
        expectedDesigns: 0,
        cloudDesigns: 0,
        errorMessage: "Invalid JSON body",
      } satisfies CloudImportResponse,
      { status: 400 },
    );
  }

  const persist = body.persist;
  if (!persist || persist.version !== 2) {
    return NextResponse.json(
      {
        success: false,
        ok: false,
        expectedProjects: 0,
        cloudProjects: 0,
        expectedDesigns: 0,
        cloudDesigns: 0,
        errorMessage: "Missing or invalid persist payload (expected version 2)",
      } satisfies CloudImportResponse,
      { status: 400 },
    );
  }

  const stats = countImportPayload(persist);
  const setMigrationMarker = body.setMigrationMarker !== false;

  try {
    const result = await importLocalToCloud(admin, persist, stats, { setMigrationMarker });
    return NextResponse.json({
      success: true,
      ok: true,
      source: body.source,
      expectedProjects: stats.projectCount,
      cloudProjects: result.verified.projectCount,
      expectedDesigns: stats.designCount,
      cloudDesigns: result.verified.designCount,
      stats: result.stats,
      verified: result.verified,
      ...diagnosticsPayload(),
    });
  } catch (err) {
    const diag = diagnosticsPayload();
    if (err instanceof CloudSyncError) {
      const schemaDiagnostics = err.schemaDiagnostics ?? diag.schemaDiagnostics;
      return NextResponse.json(
        {
          success: false,
          ok: false,
          source: body.source,
          expectedProjects: stats.projectCount,
          cloudProjects: 0,
          expectedDesigns: stats.designCount,
          cloudDesigns: 0,
          operation: err.operation,
          errorCode: err.code,
          errorMessage: err.details,
          stats,
          schemaDiagnostics,
          liveProjectColumns: schemaDiagnostics?.liveColumns,
          projectUpsertKeys: schemaDiagnostics?.filteredKeys,
        } satisfies CloudImportResponse,
        { status: 500 },
      );
    }
    if (err instanceof LiveSchemaMismatchError) {
      const schemaDiagnostics = diag.schemaDiagnostics;
      return NextResponse.json(
        {
          success: false,
          ok: false,
          source: body.source,
          expectedProjects: stats.projectCount,
          cloudProjects: 0,
          expectedDesigns: stats.designCount,
          cloudDesigns: 0,
          operation: `schema.${err.table}`,
          errorCode: "LIVE_SCHEMA_MISMATCH",
          errorMessage: err.message,
          stats,
          schemaDiagnostics,
        } satisfies CloudImportResponse,
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        ok: false,
        source: body.source,
        expectedProjects: stats.projectCount,
        cloudProjects: 0,
        expectedDesigns: stats.designCount,
        cloudDesigns: 0,
        operation: "importLocalToCloud",
        errorMessage: err instanceof Error ? err.message : "Import failed",
        stats,
        ...diag,
      } satisfies CloudImportResponse,
      { status: 500 },
    );
  }
}
