import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadWorkspaceSnapshot,
  snapshotByteSize,
  snapshotCounts,
} from "@/core/repositories/workspace-snapshot";
import { CloudSyncError } from "@/core/repositories/supabase-errors";

export const runtime = "nodejs";

export type SnapshotGetResponse = {
  ok: boolean;
  found: boolean;
  persist?: import("@/core/types").AppPersist;
  counts?: ReturnType<typeof snapshotCounts>;
  bytesStored?: number;
  errorMessage?: string;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, found: false, errorMessage: "Cloud not configured" } satisfies SnapshotGetResponse,
      { status: 503 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, found: false, errorMessage: "Admin client unavailable" } satisfies SnapshotGetResponse,
      { status: 503 },
    );
  }

  try {
    const persist = await loadWorkspaceSnapshot(admin);
    if (!persist) {
      return NextResponse.json({ ok: true, found: false } satisfies SnapshotGetResponse, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      found: true,
      persist,
      counts: snapshotCounts(persist),
      bytesStored: snapshotByteSize(persist),
    } satisfies SnapshotGetResponse);
  } catch (err) {
    const message = err instanceof CloudSyncError ? err.details : err instanceof Error ? err.message : "Load failed";
    return NextResponse.json(
      { ok: false, found: false, errorMessage: message } satisfies SnapshotGetResponse,
      { status: 500 },
    );
  }
}
