/**
 * Sanitize values for PostgreSQL JSONB storage.
 * PostgreSQL rejects `\u0000` (null) in JSON strings — "unsupported Unicode escape sequence".
 */

export type InvalidJsonbStringPath = {
  path: string;
  reason: string;
  preview: string;
};

const SECRET_KEY_PATTERN = /(api[_-]?key|secret|token|password|authorization)/i;

/** Characters PostgreSQL JSONB text cannot represent. */
const JSONB_NULL_CHAR = /\u0000/g;

function redactPath(path: string): boolean {
  return SECRET_KEY_PATTERN.test(path);
}

function previewString(value: string): string {
  const collapsed = value.replace(JSONB_NULL_CHAR, "␀").slice(0, 80);
  return collapsed.length < value.length ? `${collapsed}…` : collapsed;
}

export function sanitizeJsonbString(value: string): string {
  if (!value.includes("\u0000")) return value;
  return value.replace(JSONB_NULL_CHAR, "");
}

export function sanitizeSnapshotForJsonb<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeJsonbString(value) as T;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSnapshotForJsonb(item)) as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeSnapshotForJsonb(child);
    }
    return out as T;
  }
  return value;
}

export function findInvalidJsonbStringPaths(
  value: unknown,
  path = "root",
  found: InvalidJsonbStringPath[] = [],
): InvalidJsonbStringPath[] {
  if (typeof value === "string") {
    if (value.includes("\u0000")) {
      found.push({
        path: redactPath(path) ? "[redacted — possible secret field]" : path,
        reason: "contains U+0000 null character",
        preview: redactPath(path) ? "[redacted]" : previewString(value),
      });
    }
    return found;
  }

  if (value === null || value === undefined) return found;
  if (Array.isArray(value)) {
    value.forEach((item, index) => findInvalidJsonbStringPaths(item, `${path}[${index}]`, found));
    return found;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = path === "root" ? key : `${path}.${key}`;
      findInvalidJsonbStringPaths(child, childPath, found);
    }
  }

  return found;
}

/** Dev-only: log JSON paths of strings that need sanitization before cloud upsert. */
export function diagnoseSnapshotForJsonb(persist: unknown, label = "snapshot"): void {
  if (process.env.NODE_ENV === "production") return;
  const invalid = findInvalidJsonbStringPaths(persist);
  if (!invalid.length) return;
  console.warn(
    `[jsonb-sanitize] ${label} contains invalid JSONB strings:`,
    invalid.map((item) => `${item.path} (${item.reason})`),
  );
}

export function assertJsonbSerializable(value: unknown): void {
  const json = JSON.stringify(value);
  if (json.includes("\\u0000")) {
    throw new Error("JSON serialization still contains \\u0000 escape");
  }
}
