import { createAdminClient } from "@/lib/supabase/admin";
import {
  POST_MEDIA_ALLOWED_MIME_TYPES,
  POST_MEDIA_BUCKET,
  POST_MEDIA_MAX_BYTES,
  buildPostMediaObjectPath,
  isPostMediaTypeAllowed,
  resolveMediaContentType,
} from "@/lib/media-constants";

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaUploadError";
  }
}

export async function uploadMedia(
  userId: string,
  file: File
): Promise<{ url: string; path: string }> {
  if (!isPostMediaTypeAllowed(file)) {
    const ct = file.type || "(empty)";
    throw new MediaUploadError(
      `Invalid file type: ${ct}. Allowed: ${POST_MEDIA_ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  const contentType = resolveMediaContentType(file)!;

  if (file.size > POST_MEDIA_MAX_BYTES) {
    throw new MediaUploadError(
      `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 50MB`
    );
  }

  const supabase = createAdminClient();
  const path = buildPostMediaObjectPath(userId, file);

  const { error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new MediaUploadError(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);

  return { url: publicUrl, path };
}
