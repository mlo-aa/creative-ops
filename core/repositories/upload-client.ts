/** Client-side upload helper — sends files to server API for Supabase Storage. */

export type UploadProgress = "idle" | "uploading" | "success" | "error";

export async function uploadProjectFile(options: {
  file: File;
  projectId: string;
  assetId: string;
  bucket?: "brand-assets" | "project-assets" | "design-assets" | "exports";
  type?: string;
  category?: string;
  onProgress?: (status: UploadProgress) => void;
}): Promise<{ publicUrl: string; storagePath: string; assetId: string }> {
  options.onProgress?.("uploading");
  const form = new FormData();
  form.append("file", options.file);
  form.append("projectId", options.projectId);
  form.append("assetId", options.assetId);
  if (options.bucket) form.append("bucket", options.bucket);
  if (options.type) form.append("type", options.type);
  if (options.category) form.append("category", options.category);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    options.onProgress?.("error");
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }
  const data = await res.json();
  options.onProgress?.("success");
  return data;
}

/** Upload a data URL export blob to project storage. */
export async function uploadExportBlob(options: {
  blob: Blob;
  projectId: string;
  designId: string;
  fileName: string;
  mimeType: string;
}): Promise<{ publicUrl: string; storagePath: string; assetId: string }> {
  const file = new File([options.blob], options.fileName, { type: options.mimeType });
  return uploadProjectFile({
    file,
    projectId: options.projectId,
    assetId: `export-${options.designId}-${Date.now()}`,
    bucket: "exports",
    type: "export",
    category: "misc",
  });
}
