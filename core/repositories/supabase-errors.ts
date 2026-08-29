import type { PostgrestError } from "@supabase/supabase-js";
import type { UpsertFilterDiagnostics } from "@/core/repositories/live-schema";

export class LiveSchemaMismatchError extends Error {
  table: string;

  constructor(table: string, message: string) {
    super(`[${table}] ${message}`);
    this.name = "LiveSchemaMismatchError";
    this.table = table;
  }
}

export class CloudSyncError extends Error {
  operation: string;
  code: string;
  details: string;
  schemaDiagnostics?: UpsertFilterDiagnostics;

  constructor(
    operation: string,
    error: PostgrestError | Error,
    schemaDiagnostics?: UpsertFilterDiagnostics,
  ) {
    const pg = error as PostgrestError;
    const code = pg.code ?? "unknown";
    const details = pg.message ?? error.message;
    super(`${operation} failed (${code}): ${details}`);
    this.name = "CloudSyncError";
    this.operation = operation;
    this.code = code;
    this.details = details;
    this.schemaDiagnostics = schemaDiagnostics;
  }
}

export function assertNoError(
  operation: string,
  error: PostgrestError | null,
  schemaDiagnostics?: UpsertFilterDiagnostics,
): void {
  if (error) throw new CloudSyncError(operation, error, schemaDiagnostics);
}
