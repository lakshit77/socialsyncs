import type { MediaKind } from "@/types/media";

/**
 * Guess MIME and image/video kind from a URL path (query stripped).
 */
export function inferMimeAndKindFromUrl(url: string): {
  mime_type: string;
  kind: MediaKind;
} {
  const path = url.split("?")[0]?.toLowerCase() ?? "";

  if (path.endsWith(".png")) {
    return { mime_type: "image/png", kind: "image" };
  }
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
    return { mime_type: "image/jpeg", kind: "image" };
  }
  if (path.endsWith(".webp")) {
    return { mime_type: "image/webp", kind: "image" };
  }
  if (path.endsWith(".mp4")) {
    return { mime_type: "video/mp4", kind: "video" };
  }
  if (path.endsWith(".mov")) {
    return { mime_type: "video/quicktime", kind: "video" };
  }

  return { mime_type: "application/octet-stream", kind: "image" };
}

/**
 * Guess MIME type from a storage object filename.
 */
export function inferMimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return "application/octet-stream";
}
