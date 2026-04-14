import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaKind } from "@/types/media";
import { inferMimeAndKindFromUrl } from "@/lib/user-media-helpers";

export type RegisterExternalResult =
  | { ok: true; mediaId: string; publicUrl: string }
  | { ok: false; error: string };

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const raw = u.pathname.split("/").pop() ?? "";
    if (raw.trim()) return decodeURIComponent(raw);
  } catch {
    // ignore and fallback
  }
  return "external-media";
}

/**
 * Stores a pasted remote URL as a `user_media` row so posts always reference media IDs.
 */
export async function registerExternalUserMedia(
  supabase: SupabaseClient,
  userId: string,
  url: string,
  allowedKinds: readonly MediaKind[]
): Promise<RegisterExternalResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: "URL is empty." };
  }

  const { mime_type, kind } = inferMimeAndKindFromUrl(trimmed);
  if (!allowedKinds.includes(kind)) {
    return {
      ok: false,
      error: `This link looks like a ${kind}. For this step, use ${allowedKinds.join(" or ")} only.`,
    };
  }

  const storage_path = `external/${crypto.randomUUID()}`;

  const { data, error } = await supabase
    .from("user_media")
    .insert({
      user_id: userId,
      file_name: fileNameFromUrl(trimmed),
      storage_path,
      public_url: trimmed,
      mime_type,
      kind,
      file_size_bytes: null,
    })
    .select("id, public_url")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save URL." };
  }

  return {
    ok: true,
    mediaId: data.id as string,
    publicUrl: data.public_url as string,
  };
}
