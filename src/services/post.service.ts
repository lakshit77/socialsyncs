import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformService } from "./platforms/registry";
import type { PlatformCredentials } from "./platforms/types";
import type { PostRow, PostStatus } from "@/types/database";
import type { CreatePostInput } from "@/lib/validators";

export class PostServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "PostServiceError";
  }
}

export async function createPost(
  userId: string,
  input: CreatePostInput
): Promise<PostRow> {
  const supabase = createAdminClient();

  // 1. Fetch user's platform credentials
  const { data: credRow, error: credError } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("user_id", userId)
    .eq("platform", input.platform)
    .eq("is_active", true)
    .single();

  if (credError || !credRow) {
    throw new PostServiceError(
      `No credentials found for platform: ${input.platform}. Please add your credentials in Settings.`,
      "CREDENTIALS_NOT_FOUND"
    );
  }

  const credentials = credRow.credentials as PlatformCredentials;

  // 2. Resolve media rows (order must match media_ids)
  const { data: mediaRows, error: mediaErr } = await supabase
    .from("user_media")
    .select("id, public_url, kind")
    .eq("user_id", userId)
    .in("id", input.media_ids);

  if (mediaErr || !mediaRows?.length) {
    throw new PostServiceError(
      "Could not load media for this post.",
      "MEDIA_NOT_FOUND"
    );
  }

  const byId = new Map(
    mediaRows.map((r) => [r.id as string, r as { id: string; public_url: string; kind: string }])
  );
  const ordered = input.media_ids
    .map((id) => byId.get(id))
    .filter(Boolean) as { id: string; public_url: string; kind: string }[];

  if (ordered.length !== input.media_ids.length) {
    throw new PostServiceError(
      "One or more media items were not found or do not belong to you.",
      "MEDIA_NOT_FOUND"
    );
  }

  const media_urls = ordered.map((m) => m.public_url);

  let cover_url: string | null = input.cover_url ?? null;
  let cover_media_id: string | null = input.cover_media_id ?? null;

  if (input.cover_media_id) {
    const { data: coverRow, error: coverErr } = await supabase
      .from("user_media")
      .select("id, public_url, kind")
      .eq("user_id", userId)
      .eq("id", input.cover_media_id)
      .single();

    if (coverErr || !coverRow || coverRow.kind !== "image") {
      throw new PostServiceError(
        "Cover image not found or is not an image.",
        "COVER_MEDIA_INVALID"
      );
    }
    cover_url = coverRow.public_url as string;
    cover_media_id = coverRow.id as string;
  }

  // 3. Create container via platform service
  const service = getPlatformService(input.platform, credentials);
  const { containerId } = await service.createContainer({
    post_type: input.post_type,
    caption: input.caption,
    media_urls,
    cover_url: cover_url ?? undefined,
    audio_name: input.audio_name,
  });

  // 4. Save post to database
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      platform: input.platform,
      post_type: input.post_type,
      caption: input.caption,
      media_urls,
      cover_url,
      cover_media_id,
      audio_name: input.audio_name,
      container_id: containerId,
      status: "processing" as PostStatus,
    })
    .select()
    .single();

  if (postError || !post) {
    throw new PostServiceError(
      `Failed to save post: ${postError?.message}`,
      "DB_INSERT_FAILED"
    );
  }

  const postId = post.id as string;

  const postMediaRows = ordered.map((m, sort_order) => ({
    post_id: postId,
    media_id: m.id,
    sort_order,
  }));

  const { error: pmErr } = await supabase.from("post_media").insert(postMediaRows);

  if (pmErr) {
    throw new PostServiceError(
      `Failed to link media to post: ${pmErr.message}`,
      "POST_MEDIA_INSERT_FAILED"
    );
  }

  return post as PostRow;
}

export async function checkAndPublishPost(
  userId: string,
  postId: string
): Promise<PostRow> {
  const supabase = createAdminClient();

  // 1. Fetch the post
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", userId)
    .single();

  if (postError || !post) {
    throw new PostServiceError("Post not found", "POST_NOT_FOUND");
  }

  const typedPost = post as PostRow;

  // If already published or errored, just return current state
  if (typedPost.status === "published" || typedPost.status === "error") {
    return typedPost;
  }

  // If no container_id, nothing to check
  if (!typedPost.container_id) {
    return typedPost;
  }

  // 2. Get credentials
  const { data: credRow } = await supabase
    .from("platform_credentials")
    .select("credentials")
    .eq("user_id", userId)
    .eq("platform", typedPost.platform)
    .eq("is_active", true)
    .single();

  if (!credRow) {
    throw new PostServiceError(
      "Platform credentials not found",
      "CREDENTIALS_NOT_FOUND"
    );
  }

  const credentials = credRow.credentials as PlatformCredentials;
  const service = getPlatformService(typedPost.platform, credentials);

  // 3. Check container status
  const status = await service.checkStatus(typedPost.container_id);

  if (status.isReady) {
    // 4. Auto-publish
    try {
      const { mediaId } = await service.publish(typedPost.container_id);

      const { data: updated } = await supabase
        .from("posts")
        .update({
          status: "published" as PostStatus,
          published_media_id: mediaId,
          published_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select()
        .single();

      return (updated as PostRow) ?? typedPost;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Publish failed";
      await supabase
        .from("posts")
        .update({
          status: "error" as PostStatus,
          error_message: errorMessage,
        })
        .eq("id", postId);

      return {
        ...typedPost,
        status: "error",
        error_message: errorMessage,
      };
    }
  }

  if (status.statusCode === "ERROR" || status.statusCode === "EXPIRED") {
    await supabase
      .from("posts")
      .update({
        status: "error" as PostStatus,
        error_message: `Container status: ${status.statusCode}`,
      })
      .eq("id", postId);

    return {
      ...typedPost,
      status: "error",
      error_message: `Container status: ${status.statusCode}`,
    };
  }

  // Still processing — update status in DB if needed
  if (typedPost.status !== "processing") {
    await supabase
      .from("posts")
      .update({ status: "processing" as PostStatus })
      .eq("id", postId);
  }

  return { ...typedPost, status: "processing" };
}
