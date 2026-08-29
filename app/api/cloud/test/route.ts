import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { CloudSyncError } from "@/core/repositories/supabase-errors";
import { isMissingTableError, REQUIRED_CLOUD_TABLES } from "@/core/repositories/schema-tables";

export const runtime = "nodejs";

export type CloudTestResult = {
  cloudConfigured: boolean;
  urlPresent: boolean;
  publishableKeyPresent: boolean;
  secretKeyPresent: boolean;
  publishableKeyFormat: "legacy-jwt" | "sb_publishable" | "missing" | "unknown";
  secretKeyFormat: "legacy-jwt" | "sb_secret" | "missing" | "unknown";
  tablesExist: boolean;
  missingTables?: string[];
  writeTest: "ok" | "failed";
  readTest: "ok" | "failed";
  operation?: string;
  errorCode?: string;
  errorMessage?: string;
};

function publishableKeyFormat(key: string | undefined): CloudTestResult["publishableKeyFormat"] {
  if (!key) return "missing";
  if (key.startsWith("eyJ")) return "legacy-jwt";
  if (key.startsWith("sb_publishable_")) return "sb_publishable";
  return "unknown";
}

function secretKeyFormat(key: string | undefined): CloudTestResult["secretKeyFormat"] {
  if (!key) return "missing";
  if (key.startsWith("eyJ")) return "legacy-jwt";
  if (key.startsWith("sb_secret_")) return "sb_secret";
  return "unknown";
}

export async function GET() {
  const urlPresent = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const result: CloudTestResult = {
    cloudConfigured: isSupabaseConfigured(),
    urlPresent,
    publishableKeyPresent: Boolean(publishableKey),
    secretKeyPresent: Boolean(secretKey),
    publishableKeyFormat: publishableKeyFormat(publishableKey),
    secretKeyFormat: secretKeyFormat(secretKey),
    tablesExist: false,
    writeTest: "failed",
    readTest: "failed",
  };

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({
      ...result,
      operation: "getSupabaseAdmin",
      errorMessage: "Server admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY in .env.local",
    });
  }

  try {
    const missingTables: string[] = [];
    for (const table of REQUIRED_CLOUD_TABLES) {
      const { error } = await admin.from(table).select("*", { head: true, count: "exact" });
      if (isMissingTableError(error)) {
        missingTables.push(table);
        continue;
      }
      assertOrSet(result, error, `${table}.select`);
    }

    if (missingTables.length) {
      return NextResponse.json({
        ...result,
        missingTables,
        operation: `${missingTables[0]}.select`,
        errorCode: "PGRST205",
        errorMessage: `Missing tables: ${missingTables.join(", ")} — run supabase/migrations/001_initial_schema.sql in the Supabase SQL Editor`,
      });
    }

    result.tablesExist = true;
    result.readTest = "ok";

    const probeId = `__cloud_probe_${Date.now()}`;
    const { error: writeErr } = await admin.from("projects").upsert({
      id: probeId,
      code: "",
      name: "__cloud_write_probe__",
      client_name: "",
      is_seed: false,
      updated_at: new Date().toISOString(),
    });
    assertOrSet(result, writeErr, "projects.writeTest");
    await admin.from("projects").delete().eq("id", probeId);
    result.writeTest = "ok";

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CloudSyncError) {
      return NextResponse.json({
        ...result,
        operation: err.operation,
        errorCode: err.code,
        errorMessage: err.details,
      });
    }
    return NextResponse.json({
      ...result,
      operation: "cloud.test",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

function assertOrSet(result: CloudTestResult, error: PostgrestError | null, op: string) {
  if (error) {
    result.operation = op;
    result.errorCode = error.code;
    result.errorMessage = error.message;
    throw new CloudSyncError(op, error);
  }
}
