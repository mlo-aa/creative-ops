"use client";

import { useStudio } from "@/core/store";
import { btnGhost, btnPrimary } from "@/core/ui/OpsField";
import type { MigrationDiagnostics } from "@/core/repositories/cloud-api";
import { useEffect, useState } from "react";

function DiagnosticPanel({ diag }: { diag: MigrationDiagnostics | null }) {
  if (!diag) return null;
  return (
    <div className="mt-4 space-y-1 border border-white/10 bg-black/30 p-3 font-mono text-[11px]">
      <p>cloud configured: {diag.cloudConfigured ? "yes" : "no"}</p>
      <p>legacy data found ({diag.legacyKey}): {diag.legacyDataFound ? "yes" : "no"}</p>
      <p>
        migration marker present ({diag.migrationMarkerKey}):{" "}
        {diag.migrationMarkerPresent === undefined ? "—" : diag.migrationMarkerPresent ? "yes" : "no"}
      </p>
      <p>
        cloud projects count: {diag.cloudProjectCount === undefined ? "—" : diag.cloudProjectCount}
      </p>
      <p>
        cloud designs count: {diag.cloudDesignCount === undefined ? "—" : diag.cloudDesignCount}
      </p>
      {diag.stats ? (
        <>
          <p>expected local projects: {diag.stats.projectCount}</p>
          <p>expected local designs: {diag.stats.designCount}</p>
          <p>user projects: {diag.stats.userProjectCount}</p>
          <p>overlay projects: {diag.stats.overlayProjectIds.join(", ") || "—"}</p>
        </>
      ) : null}
      {diag.cloudTest ? (
        <>
          <p className="mt-2 opacity-50">— cloud test —</p>
          <p>secret key present: {diag.cloudTest.secretKeyPresent ? "yes" : "no"}</p>
          <p>key format: {diag.cloudTest.secretKeyFormat}</p>
          <p>tables exist: {diag.cloudTest.tablesExist ? "yes" : "no"}</p>
          {diag.cloudTest.missingTables?.length ? (
            <p className="text-amber-400">missing tables: {diag.cloudTest.missingTables.join(", ")}</p>
          ) : null}
          <p>write test: {diag.cloudTest.writeTest}</p>
          <p>read test: {diag.cloudTest.readTest}</p>
          {diag.cloudTest.errorMessage && diag.cloudTest.writeTest !== "ok" ? (
            <p className="text-red-400">{diag.cloudTest.errorMessage}</p>
          ) : null}
        </>
      ) : null}
      {diag.verified ? (
        <p className="mt-2 text-green-400">
          verified in cloud: {diag.verified.projectCount} projects, {diag.verified.designCount} designs
        </p>
      ) : null}
      {diag.lastOperation ? <p className="text-red-400">failed operation: {diag.lastOperation}</p> : null}
      {diag.lastErrorCode ? <p className="text-red-400">error code: {diag.lastErrorCode}</p> : null}
      {diag.lastErrorMessage ? <p className="text-red-400">error: {diag.lastErrorMessage}</p> : null}
    </div>
  );
}

export function MigrationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    migrationRecoveryMode,
    refreshMigrationDiagnostics,
    importLocalData,
    testCloudConnection,
    resetMigrationMarker,
    dismissMigration,
  } = useStudio();
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [diag, setDiag] = useState<MigrationDiagnostics | null>(null);
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!open) return;
    void refreshMigrationDiagnostics().then(setDiag);
  }, [open, refreshMigrationDiagnostics]);

  if (!open) return null;

  const recovery = diag?.recoveryMode ?? migrationRecoveryMode;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto border border-white/15 bg-[#1b1c1f] p-6">
        <h2 className="text-xl tracking-[-0.03em]">
          {recovery ? "Cloud import recovery" : "Existing local Creative Ops data found"}
        </h2>
        {recovery ? (
          <p className="mt-3 border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100/90">
            Local data exists but cloud import was not verified.
          </p>
        ) : (
          <p className="mt-3 text-sm opacity-55">
            Your browser has saved projects, designs, and context in localStorage ({diag?.legacyKey ?? "scs:v1"}).
            Import uses the server-side connection (service role) so writes are not blocked by browser permissions.
          </p>
        )}

        <DiagnosticPanel diag={diag} />

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className={btnGhost}
            disabled={testing || busy || resetting}
            onClick={async () => {
              setTesting(true);
              setError("");
              try {
                const test = await testCloudConnection();
                setDiag((d) => ({ ...(d ?? {}), cloudTest: test } as MigrationDiagnostics));
                if (test.writeTest !== "ok") {
                  setError(test.errorMessage ?? "Cloud connection test failed");
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : "Test failed");
              } finally {
                setTesting(false);
              }
            }}
          >
            {testing ? "Testing…" : "Test cloud connection"}
          </button>
          {isDev ? (
            <button
              type="button"
              className={btnGhost}
              disabled={testing || busy || resetting}
              onClick={async () => {
                setResetting(true);
                setError("");
                try {
                  const result = await resetMigrationMarker();
                  if (!result.ok) {
                    setError(result.errorMessage ?? "Failed to reset migration marker");
                    return;
                  }
                  const refreshed = await refreshMigrationDiagnostics();
                  setDiag(refreshed);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Reset failed");
                } finally {
                  setResetting(false);
                }
              }}
            >
              {resetting ? "Resetting…" : "Reset migration marker"}
            </button>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={btnPrimary}
            disabled={busy || testing || resetting}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const result = await importLocalData();
                setDiag(result);
                onClose();
              } catch (e) {
                const err = e as Error & { diagnostics?: MigrationDiagnostics };
                if (err.diagnostics) setDiag(err.diagnostics);
                setError(err.message || "Import failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Importing…" : recovery ? "Retry import" : "Import to cloud"}
          </button>
          <button
            type="button"
            className={btnGhost}
            disabled={busy || resetting}
            onClick={() => {
              dismissMigration();
              onClose();
            }}
          >
            Cancel
          </button>
        </div>
        <p className="mt-4 text-[10px] opacity-35">
          scs:v1 is preserved until import succeeds and is verified in Supabase. Retry is safe.
        </p>
      </div>
    </div>
  );
}
