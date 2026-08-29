import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getLiveSchemaInfo } from "@/core/repositories/live-schema";

export const runtime = "nodejs";

export type LiveSchemaResult = {
  cloudConfigured: boolean;
  liveProjectColumns: string[];
  introspectionSource: "openapi" | "fallback";
  operation?: string;
  errorMessage?: string;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      cloudConfigured: false,
      liveProjectColumns: [],
      introspectionSource: "fallback",
      errorMessage: "Cloud not configured",
    } satisfies LiveSchemaResult);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({
      cloudConfigured: true,
      liveProjectColumns: [],
      introspectionSource: "fallback",
      operation: "getSupabaseAdmin",
      errorMessage: "Server admin client unavailable",
    } satisfies LiveSchemaResult);
  }

  try {
    const info = await getLiveSchemaInfo(admin);
    return NextResponse.json({
      cloudConfigured: true,
      liveProjectColumns: info.liveProjectColumns,
      introspectionSource: info.introspectionSource,
    } satisfies LiveSchemaResult);
  } catch (err) {
    return NextResponse.json({
      cloudConfigured: true,
      liveProjectColumns: [],
      introspectionSource: "fallback",
      operation: "live-schema",
      errorMessage: err instanceof Error ? err.message : "Schema introspection failed",
    } satisfies LiveSchemaResult);
  }
}
