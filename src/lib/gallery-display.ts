import type { UserMediaRow } from "@/types/database";

/**
 * Shared formatting and labeling for gallery cards (main Gallery page and pickers).
 */

export function formatBytes(value: number | null): string {
  if (!value || value <= 0) return "-";
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Fixed locale + UTC so server and client produce identical strings (avoids hydration mismatch).
 */
export function formatDate(value: string): string {
  const d = new Date(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function displayName(row: UserMediaRow): string {
  const fallback = row.kind === "video" ? "Video file" : "Image file";
  return row.file_name?.trim() || fallback;
}

export type MediaCategory = "image" | "video" | "other";

export function mediaCategory(row: UserMediaRow): MediaCategory {
  if (row.mime_type.startsWith("image/")) return "image";
  if (row.mime_type.startsWith("video/")) return "video";
  return "other";
}
