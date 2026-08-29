import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AppPersist } from "@/core/types";
import { saveWorkspaceSnapshot, isValidPersistSnapshot } from "@/core/repositories/workspace-snapshot";
import { CloudSyncError } from "@/core/repositories/supabase-errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, operation: "getSupabaseAdmin", errorMessage: "Admin client unavailable" },
      { status: 503 },
    );
  }

  let body: { persist?: AppPersist };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, errorMessage: "Invalid JSON" }, { status: 400 });
  }

  if (!body.persist || !isValidPersistSnapshot(body.persist)) {
    return NextResponse.json({ ok: false, errorMessage: "Missing or invalid persist" }, { status: 400 });
  }

  try {
    await saveWorkspaceSnapshot(admin, body.persist);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CloudSyncError) {
      return NextResponse.json(
        { ok: false, operation: err.operation, errorCode: err.code, errorMessage: err.details },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: false, errorMessage: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
