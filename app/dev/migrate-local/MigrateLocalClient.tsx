"use client";

import type { AppPersist } from "@/core/types";
import { CACHE_KEY } from "@/core/repository/cache";
import { countImportPayload } from "@/core/repositories/import-stats";
import type { SnapshotMigrateResponse } from "@/app/api/cloud/snapshot/migrate/route";
import type { SnapshotGetResponse } from "@/app/api/cloud/snapshot/route";
import { useCallback, useEffect, useState } from "react";

type LocalSnapshot = {
  persist: AppPersist;
  projects: number;
  designs: number;
  templates: number;
  campaigns: number;
  bytes: number;
};

function readCachePersist(): LocalSnapshot | null {
  try {
    const cacheRaw = localStorage.getItem(CACHE_KEY);
    if (!cacheRaw) return null;
    const persist = JSON.parse(cacheRaw) as AppPersist;
    const stats = countImportPayload(persist);
    return {
      persist,
      projects: stats.projectCount,
      designs: stats.designCount,
      templates: stats.templateCount,
      campaigns: stats.campaignCount,
      bytes: new Blob([cacheRaw]).size,
    };
  } catch {
    return null;
  }
}

export function MigrateLocalClient() {
  const [local, setLocal] = useState<LocalSnapshot | null>(null);
  const [cloud, setCloud] = useState<SnapshotGetResponse | null>(null);
  const [busy, setBusy] = useState<"migrate" | "verify" | null>(null);
  const [result, setResult] = useState<SnapshotMigrateResponse | null>(null);
  const [error, setError] = useState("");

  const refreshLocal = useCallback(() => {
    setLocal(readCachePersist());
  }, []);

  const verifyCloud = useCallback(async () => {
    setBusy("verify");
    setError("");
    try {
      const res = await fetch("/api/cloud/snapshot");
      const data = (await res.json()) as SnapshotGetResponse;
      setCloud(data);
      if (data.errorMessage) setError(data.errorMessage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    refreshLocal();
    void verifyCloud();
  }, [refreshLocal, verifyCloud]);

  async function migrate() {
    if (!local) {
      setError(`No local data found in ${CACHE_KEY}`);
      return;
    }

    setBusy("migrate");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/cloud/snapshot/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persist: local.persist, source: CACHE_KEY }),
      });
      const data = (await res.json()) as SnapshotMigrateResponse;
      setResult(data);
      if (!data.success) {
        setError(data.errorMessage ?? "Snapshot upload failed");
      } else {
        await verifyCloud();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Migration failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl p-6 font-mono text-sm text-white">
      <h1 className="mb-2 text-xl tracking-tight">Dev: snapshot → Supabase</h1>
      <p className="mb-6 text-xs opacity-50">
        Uploads the full workspace JSON to <code>workspace_snapshots/main</code>. Does not delete
        localStorage or transform IDs.
      </p>

      <section className="mb-6 space-y-1 border border-white/10 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-widest opacity-40">Local cache ({CACHE_KEY})</p>
        <p>found: {local ? "yes" : "no"}</p>
        <p>projects: {local?.projects ?? "—"}</p>
        <p>designs: {local?.designs ?? "—"}</p>
        <p>templates: {local?.templates ?? "—"}</p>
        <p>campaigns: {local?.campaigns ?? "—"}</p>
        <p>bytes: {local?.bytes ?? "—"}</p>
        <button
          type="button"
          className="mt-2 text-xs underline opacity-60"
          onClick={refreshLocal}
        >
          Re-read localStorage
        </button>
      </section>

      <section className="mb-6 space-y-1 border border-white/10 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-widest opacity-40">Cloud snapshot (main)</p>
        <p>found: {cloud?.found ? "yes" : cloud ? "no" : "—"}</p>
        <p>projects: {cloud?.counts?.projects ?? "—"}</p>
        <p>designs: {cloud?.counts?.designs ?? "—"}</p>
        <p>templates: {cloud?.counts?.templates ?? "—"}</p>
        <p>campaigns: {cloud?.counts?.campaigns ?? "—"}</p>
        <p>bytes: {cloud?.bytesStored ?? "—"}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!local || busy !== null}
          className="border border-white/20 bg-white px-4 py-2 text-black disabled:opacity-40"
          onClick={() => void migrate()}
        >
          {busy === "migrate" ? "Uploading…" : "Migrate local snapshot to Supabase"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          className="border border-white/20 px-4 py-2 disabled:opacity-40"
          onClick={() => void verifyCloud()}
        >
          {busy === "verify" ? "Checking…" : "Verify cloud snapshot"}
        </button>
      </div>

      {error ? <p className="mt-4 text-red-400">{error}</p> : null}

      {result?.success ? (
        <section className="mt-4 space-y-1 border border-green-500/40 bg-green-950/20 p-4">
          <p className="text-green-300">Success — snapshot uploaded and verified</p>
          <p>projects: {result.projects}</p>
          <p>designs: {result.designs}</p>
          <p>campaigns: {result.campaigns}</p>
          <p>templates: {result.templates}</p>
          <p>bytes stored: {result.bytesStored.toLocaleString()}</p>
        </section>
      ) : null}

      {result && !result.success ? (
        <pre className="mt-6 overflow-auto border border-white/10 bg-black/40 p-4 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
