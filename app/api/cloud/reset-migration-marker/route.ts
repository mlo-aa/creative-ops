import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { clearMigrationCompleted } from "@/core/repositories/workspace";
import { MIGRATION_MARKER_KEY } from "@/core/repositories/migration-recovery";
import { CloudSyncError } from "@/core/repositories/supabase-errors";

export const runtime = "nodejs";

/** Developer-only: clears the cloud migration marker without touching projects, designs, or localStorage. */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, errorMessage: "Reset migration marker is only available in development builds" },
      { status: 403 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        operation: "getSupabaseAdmin",
        errorMessage: "Server admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY in .env.local",
      },
      { status: 503 },
    );
  }

  try {
    await clearMigrationCompleted(admin);
    return NextResponse.json({ ok: true, migrationMarkerKey: MIGRATION_MARKER_KEY });
  } catch (err) {
    if (err instanceof CloudSyncError) {
      return NextResponse.json(
        {
          ok: false,
          operation: err.operation,
          errorCode: err.code,
          errorMessage: err.details,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        errorMessage: err instanceof Error ? err.message : "Failed to reset migration marker",
      },
      { status: 500 },
    );
  }
}
