import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assetPath, uploadAssetRecord, uploadToStorage, type StorageBucket } from "@/core/repositories/assets";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const form = await request.formData();
    const file = form.get("file") as File | null;
    const projectId = form.get("projectId") as string | null;
    const assetId = form.get("assetId") as string | null;
    const bucket = (form.get("bucket") as StorageBucket | null) ?? "project-assets";
    const assetType = (form.get("type") as string | null) ?? "other";
    const category = (form.get("category") as string | null) ?? "misc";

    if (!file || !projectId || !assetId) {
      return NextResponse.json({ error: "Missing file, projectId, or assetId" }, { status: 400 });
    }

    const path = assetPath(bucket, projectId, assetId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicUrl, storagePath } = await uploadToStorage(bucket, path, buffer, file.type);

    await uploadAssetRecord(projectId, {
      id: assetId,
      type: assetType,
      name: file.name,
      storagePath,
      publicUrl,
      mimeType: file.type,
      fileSize: file.size,
      category,
    });

    return NextResponse.json({ publicUrl, storagePath, assetId });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
