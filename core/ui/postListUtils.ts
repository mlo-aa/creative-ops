import type { StudioPost } from "@/core/types";

export type PostKindFilter =
  | "all"
  | "active"
  | "draft"
  | "gif"
  | "static"
  | "carousel"
  | "reels";

export function isReelPost(post: StudioPost): boolean {
  return post.video != null;
}

export function reelDurationLabel(post: StudioPost): string {
  const ms = post.video?.durationMs ?? post.durationMs ?? 0;
  return `${Math.round(ms / 1000)}s`;
}

export function matchesPostKindFilter(post: StudioPost, kindFilter: PostKindFilter): boolean {
  if (kindFilter === "reels") return isReelPost(post);
  if (kindFilter === "gif" && post.exportKind !== "gif") return false;
  if (kindFilter === "static" && (post.exportKind !== "jpg" || isReelPost(post))) return false;
  if (kindFilter === "carousel" && post.kind !== "carousel") return false;
  if (kindFilter === "draft" && post.status !== "draft") return false;
  if (kindFilter === "active" && post.status !== "active") return false;
  return true;
}

export const POST_KIND_FILTERS: PostKindFilter[] = [
  "all",
  "active",
  "draft",
  "gif",
  "static",
  "carousel",
  "reels",
];

export type PostRow = { project: { id: string; name: string }; post: import("@/core/types").StudioPost };

export function dedupePostRows(rows: PostRow[]): PostRow[] {
  const seen = new Set<string>();
  return rows.filter(({ project, post }) => {
    const key = `${project.id}:${post.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function countDuplicatePostRows(rows: PostRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { project, post } of rows) {
    const key = `${project.id}:${post.id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
