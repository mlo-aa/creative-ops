import type { BrandProfile } from "@/core/types";
import type { VideoDocument } from "@/core/video/document";
import { buildProductionKitSummary } from "@/core/video/production/manifest";
import {
  downloadBlob,
  exportProductionKitZip,
  exportStoryboardJson,
  exportStoryboardMarkdown,
} from "@/core/video/production/export-kit";
import { btnGhost, btnPrimary } from "@/core/ui/OpsField";
import { useState } from "react";

export function ProductionKitPanel({
  doc,
  brand,
  project,
  postId,
}: {
  doc: VideoDocument;
  brand: BrandProfile;
  project: { id: string; name: string };
  postId: string;
}) {
  const summary = buildProductionKitSummary(doc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  async function handleExportKit() {
    setBusy(true);
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
      setError(e instanceof Error ? e.message : "Production kit export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-white/10 pt-4">
      <p className="text-[10px] uppercase tracking-widest opacity-40">Production kit</p>

      <div className="flex flex-wrap gap-1">
        <button type="button" className={btnGhost} onClick={() => exportStoryboardMarkdown(doc, brand, project.name)}>
          Export storyboard (MD)
        </button>
        <button type="button" className={btnGhost} onClick={() => exportStoryboardJson(doc, brand, project.name)}>
          Export storyboard (JSON)
        </button>
      </div>

      <button type="button" className={`${btnGhost} w-full text-xs`} onClick={() => setShowSummary((v) => !v)}>
        {showSummary ? "Hide kit summary" : "Preview kit summary"}
      </button>

      {showSummary ? (
        <ul className="space-y-1 text-xs opacity-70">
          <li>
            {summary.storyboard.label} — {summary.storyboard.status === "ready" ? "Ready" : "Missing"}
          </li>
          <li>
            {summary.voiceover.label} — {summary.voiceover.status === "ready" ? "Ready" : "Missing"}
          </li>
          <li>
            {summary.music.label} — {summary.music.status === "ready" ? "Ready" : "Missing"}
          </li>
          <li>
            {summary.soundEffects.label} — {summary.soundEffects.count} generated
          </li>
          <li>
            {summary.visualAssets.label} — {summary.visualAssets.count}
          </li>
          <li>
            {summary.videoClips.label} — {summary.videoClips.count}
          </li>
        </ul>
      ) : null}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <button type="button" className={btnPrimary} disabled={busy} onClick={() => void handleExportKit()}>
        {busy ? "Building ZIP…" : "Export production kit"}
      </button>
      <p className="text-[10px] opacity-35">Missing resources do not block export.</p>
    </div>
  );
}
