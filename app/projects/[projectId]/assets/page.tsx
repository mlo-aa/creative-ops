"use client";

import type { AssetCategory } from "@/core/types";
import { uploadProjectFile } from "@/core/repositories/upload-client";
import { useProject } from "@/core/project/context";
import { useStudio } from "@/core/store";
import { useState } from "react";

const CATEGORIES: AssetCategory[] = [
  "logos",
  "photography",
  "illustrations",
  "icons",
  "backgrounds",
  "textures",
  "ui",
  "misc",
];

export default function AssetsPage() {
  const project = useProject();
  const { addAsset, removeAsset, renameAsset, cloudEnabled } = useStudio();
  const [uploadStatus, setUploadStatus] = useState("");

  async function handleUpload(file: File) {
    const assetId = `asset-${Date.now()}`;
    if (cloudEnabled) {
      setUploadStatus("Uploading…");
      try {
        const { publicUrl } = await uploadProjectFile({
          file,
          projectId: project.id,
          assetId,
          bucket: "project-assets",
          category: "misc",
        });
        addAsset(project.id, {
          id: assetId,
          name: file.name,
          src: publicUrl,
          category: "misc",
          tags: [],
        });
        setUploadStatus("Uploaded.");
      } catch (e) {
        setUploadStatus(e instanceof Error ? e.message : "Upload failed");
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      addAsset(project.id, {
        id: assetId,
        name: file.name,
        src: reader.result,
        category: "misc",
        tags: [],
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.03em]">Assets</h1>
          <p className="mt-2 text-sm opacity-55">
            {cloudEnabled ? "Stored in Supabase Storage when uploaded." : "Local cache only — configure Supabase for cloud storage."}
          </p>
        </div>
        <label className="h-10 cursor-pointer border border-white/20 px-4 text-[11px] leading-10 tracking-[0.08em] uppercase">
          Upload
          <input
            type="file"
            accept="image/*,.svg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void handleUpload(file);
              event.target.value = "";
            }}
          />
        </label>
        {uploadStatus ? <span className="text-xs opacity-50">{uploadStatus}</span> : null}
      </div>
      {CATEGORIES.map((category) => {
        const items = project.assets.filter((asset) => asset.category === category);
        if (!items.length) return null;
        return (
          <section key={category} className="mt-10">
            <h2 className="mb-4 text-xs tracking-[0.16em] uppercase opacity-50">{category}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {items.map((asset) => (
                <div key={asset.id} className="border border-white/10 p-2">
                  <div className="aspect-square overflow-hidden bg-black/30">
                    <img src={asset.src} alt={asset.name} className="h-full w-full object-contain" />
                  </div>
                  <input
                    value={asset.name}
                    onChange={(event) => renameAsset(project.id, asset.id, event.target.value)}
                    className="mt-2 w-full bg-transparent text-[12px]"
                  />
                  <button
                    type="button"
                    className="mt-1 text-[11px] uppercase tracking-[0.08em] opacity-50"
                    onClick={() => removeAsset(project.id, asset.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
