import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type StorageBucket = "brand-assets" | "project-assets" | "design-assets" | "exports";

const BUCKETS: StorageBucket[] = ["brand-assets", "project-assets", "design-assets", "exports"];

export async function ensureBuckets(): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  for (const bucket of BUCKETS) {
    await admin.storage.createBucket(bucket, { public: true }).catch(() => {
      /* already exists */
    });
  }
}

export function assetPath(
  bucket: StorageBucket,
  projectId: string,
  assetId: string,
  fileName: string,
): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
  return `${projectId}/${assetId}.${ext}`;
}

export async function uploadToStorage(
  bucket: StorageBucket,
  path: string,
  file: Buffer | Blob,
  contentType: string,
): Promise<{ publicUrl: string; storagePath: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase admin not configured");

  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl, storagePath: `${bucket}/${path}` };
}

export async function uploadAssetRecord(
  projectId: string,
  asset: {
    id: string;
    type: string;
    name: string;
    storagePath: string;
    publicUrl: string;
    mimeType: string;
    fileSize: number;
    tags?: string[];
    category?: string;
    width?: number;
    height?: number;
  },
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("assets").upsert({
    id: asset.id,
    project_id: projectId,
    type: asset.type,
    name: asset.name,
    storage_path: asset.storagePath,
    public_url: asset.publicUrl,
    mime_type: asset.mimeType,
    file_size: asset.fileSize,
    width: asset.width ?? null,
    height: asset.height ?? null,
    tags: asset.tags ?? [],
    category: asset.category ?? "misc",
    metadata: {},
  });
}
