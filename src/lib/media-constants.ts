/** Supabase Storage bucket for post images and videos. */
export const POST_MEDIA_BUCKET = "post-media";

export const POST_MEDIA_ALLOWED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];

export const POST_MEDIA_MAX_BYTES = 50 * 1024 * 1024;

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

/**
 * Returns a MIME type for storage Content-Type when `file.type` is missing
 * (some browsers leave it empty for camera / filesystem picks).
 */
export function resolveMediaContentType(file: File): string | null {
  if (file.type && POST_MEDIA_ALLOWED_MIME_TYPES.includes(file.type)) {
    return file.type;
  }
  const lower = file.name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return null;
  return EXT_TO_MIME[lower.slice(dot)] ?? null;
}

export function isPostMediaTypeAllowed(file: File): boolean {
  return resolveMediaContentType(file) !== null;
}

export function sanitizeStorageFilename(filename: string): string {
  return (filename || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildPostMediaObjectPath(userId: string, file: File): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeStorageFilename(file.name || "upload");
  return `${userId}/${timestamp}_${sanitizedName}`;
}
