/** Tables required for cloud persistence — must match supabase/migrations/001_initial_schema.sql */
export const REQUIRED_CLOUD_TABLES = [
  "projects",
  "designs",
  "feeds",
  "feed_items",
  "assets",
  "workspace_meta",
] as const;

export type RequiredCloudTable = (typeof REQUIRED_CLOUD_TABLES)[number];

export function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || Boolean(error.message?.includes("does not exist"));
}
