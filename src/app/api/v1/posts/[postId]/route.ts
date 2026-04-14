import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  checkAndPublishPost,
  PostServiceError,
} from "@/services/post.service";
import { InstagramApiError } from "@/services/platforms/instagram/instagram.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    // 2. Check status and auto-publish if ready
    const post = await checkAndPublishPost(user.id, postId);

    return apiSuccess({
      post_id: post.id,
      platform: post.platform,
      post_type: post.post_type,
      status: post.status,
      container_id: post.container_id,
      published_media_id: post.published_media_id,
      error_message: post.error_message,
      created_at: post.created_at,
      published_at: post.published_at,
    });
  } catch (err) {
    if (err instanceof PostServiceError) {
      const status = err.code === "POST_NOT_FOUND" ? 404 : 400;
      return apiError(err.code, err.message, status);
    }
    if (err instanceof InstagramApiError) {
      return apiError(
        "PLATFORM_API_ERROR",
        err.message,
        err.statusCode >= 500 ? 502 : 400,
        err.apiError
      );
    }
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
