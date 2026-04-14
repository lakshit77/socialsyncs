import { createAdminClient } from "@/lib/supabase/admin";
import { POST_MEDIA_BUCKET } from "@/lib/media-constants";
import { inferMimeFromFilename } from "@/lib/user-media-helpers";

/**
 * Ensures every object under `post-media/{userId}/` has a `user_media` row.
 * Safe to call on gallery load; skips existing `storage_path` rows.
 */
export async function syncUserMediaFromStorage(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: existingRows } = await admin
    .from("user_media")
    .select("storage_path")
    .eq("user_id", userId);

  const existingSet = new Set(
    (existingRows ?? []).map((r) => r.storage_path as string)
  );

  const { data: files, error } = await admin.storage
    .from(POST_MEDIA_BUCKET)
    .list(userId, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error || !files?.length) {
    return;
  }

  for (const obj of files) {
    if (!obj.name || obj.name.endsWith("/")) {
      continue;
    }

    const storage_path = `${userId}/${obj.name}`;
    if (existingSet.has(storage_path)) {
      continue;
    }

    const mimeRaw = obj.metadata?.mimetype;
    const mime_type =
      typeof mimeRaw === "string" && mimeRaw.length > 0
        ? mimeRaw
        : inferMimeFromFilename(obj.name);

    const kind = mime_type.startsWith("video/") ? "video" : "image";
    const sizeRaw = obj.metadata?.size;
    const file_size_bytes =
      typeof sizeRaw === "number" ? sizeRaw : null;

    const { data: pub } = admin.storage
      .from(POST_MEDIA_BUCKET)
      .getPublicUrl(storage_path);
    const publicUrl = pub.publicUrl;

    const { error: insertError } = await admin.from("user_media").insert({
      user_id: userId,
      file_name: obj.name.replace(/^\d+_/, ""),
      storage_path,
      public_url: publicUrl,
      mime_type,
      file_size_bytes,
      kind,
    });

    if (!insertError) {
      existingSet.add(storage_path);
    }
  }
}
