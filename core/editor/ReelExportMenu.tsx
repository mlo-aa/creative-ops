"use client";

import type { BrandProfile } from "@/core/types";
import type { VideoDocument } from "@/core/video/document";
import { buildProductionKitSummary } from "@/core/video/production/manifest";
import {
  downloadBlob,
  exportProductionKitZip,
  exportStoryboardJson,
  exportStoryboardMarkdown,
} from "@/core/video/production/export-kit";
import { btnPrimary } from "@/core/ui/OpsField";
import { DropdownMenu, MenuDivider, MenuHeading, MenuItem } from "@/core/ui/workspace-ui";
import { useState } from "react";

type RenderStatus = { available: boolean; requiresWorker: boolean; message: string };

export function ReelExportMenu({
  doc,
  brand,
  project,
  postId,
  renderStatus,
  onExportMp4,
  exportBusy,
}: {
  doc: VideoDocument;
  brand: BrandProfile;
  project: { id: string; name: string };
  postId: string;
  renderStatus: RenderStatus | null;
  onExportMp4: () => void;
  exportBusy: boolean;
}) {
  const summary = buildProductionKitSummary(doc);
  const [kitBusy, setKitBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleExportKit() {
    setKitBusy(true);
    setError("");
    try {
      const { blob, folderName } = await exportProductionKitZip({
        doc,
        brand,
        project,
        postId,
      });
      downloadBlob(blob, `${folderName}-production-kit.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setKitBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu
        label="Export reel"
        align="right"
        trigger={
          <span className={btnPrimary}>
            {kitBusy || exportBusy ? "Exporting…" : "Export"}
          </span>
        }
      >
        <MenuHeading>Recommended</MenuHeading>
        <MenuItem onClick={() => void handleExportKit()} disabled={kitBusy}>
          Production Kit (ZIP)
        </MenuItem>
        <p className="px-3 pb-2 text-[10px] leading-snug opacity-40">
          Storyboard, audio, prompts, and assets for CapCut / Premiere / Resolve.
        </p>
        <MenuDivider />
        <MenuHeading>Storyboard only</MenuHeading>
        <MenuItem onClick={() => exportStoryboardMarkdown(doc, brand, project.name)}>
          Storyboard (Markdown)
        </MenuItem>
        <MenuItem onClick={() => exportStoryboardJson(doc, brand, project.name)}>
          Storyboard (JSON)
        </MenuItem>
        <MenuDivider />
        <MenuHeading>Video</MenuHeading>
        {renderStatus?.available ? (
          <MenuItem onClick={onExportMp4} disabled={exportBusy}>
            Export MP4
          </MenuItem>
        ) : (
          <MenuItem disabled title={renderStatus?.message}>
            MP4 unavailable (render worker required)
          </MenuItem>
        )}
        <MenuDivider />
        <div className="px-3 py-2 text-[10px] opacity-40">
          VO {summary.voiceover.status} · Music {summary.music.status} · SFX {summary.soundEffects.count}
        </div>
      </DropdownMenu>
      {error ? <p className="max-w-xs text-right text-[10px] text-red-300">{error}</p> : null}
    </div>
  );
}
