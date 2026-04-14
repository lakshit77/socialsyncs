import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { createPostSchema } from "@/lib/validators";
import { createPost, PostServiceError } from "@/services/post.service";
import { InstagramApiError } from "@/services/platforms/instagram/instagram.service";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.issues
      );
    }

    // 3. Create the post
    const post = await createPost(user.id, parsed.data);

    return apiSuccess(
      {
        post_id: post.id,
        container_id: post.container_id,
        status: post.status,
        status_check_url: `/api/v1/posts/${post.id}`,
      },
      201
    );
  } catch (err) {
    if (err instanceof PostServiceError) {
      return apiError(err.code, err.message, 400);
    }
    if (err instanceof InstagramApiError) {
      return apiError(
        "PLATFORM_API_ERROR",
        err.message,
        err.statusCode >= 500 ? 502 : 400,
        err.apiError
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError("INTERNAL_ERROR", message, 500);
  }
}
