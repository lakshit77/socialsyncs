import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api-response";
import { OAuthConnectionService } from "@/services/oauth/oauth-connection.service";
import { YouTubeService } from "@/services/platforms/youtube/youtube.service";

interface ReplyRow {
  id: string;
  user_id: string;
  video_id: string;
  comment_id: string;
  ai_reply: string | null;
  status: string;
}

/**
 * Posts an approved AI reply to YouTube and marks it as posted in the database.
 * Requires the reply row to belong to the authenticated user.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
): Promise<Response> {
  try {
    const { replyId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    const adminSupabase = createAdminClient();

    // Fetch the reply row and verify ownership.
    const { data: replyRow, error: fetchError } = await adminSupabase
      .from("youtube_comment_replies")
      .select("id, user_id, video_id, comment_id, ai_reply, status")
      .eq("id", replyId)
      .eq("user_id", user.id)
      .maybeSingle<ReplyRow>();

    if (fetchError || !replyRow) {
      return apiError("NOT_FOUND", "Reply not found", 404);
    }

    if (!replyRow.ai_reply?.trim()) {
      return apiError("VALIDATION_ERROR", "Reply text is empty", 400);
    }

    if (replyRow.status === "posted") {
      return apiError("CONFLICT", "Reply has already been posted", 409);
    }

    // Resolve YouTube credentials.
    const oauthService = new OAuthConnectionService();
    const connection = await oauthService.getConnection(user.id, "youtube");
    if (!connection || connection.status !== "active") {
      return apiError(
        "YOUTUBE_NOT_CONNECTED",
        "No active YouTube connection. Reconnect from Settings.",
        400
      );
    }
    const accessToken = await oauthService.getValidAccessToken(user.id, "youtube");

    const youtubeService = new YouTubeService({
      access_token: accessToken,
      channel_id: connection.accountId,
    });

    // Post the reply to YouTube.
    await youtubeService.postReply(replyRow.comment_id, replyRow.ai_reply.trim());

    // Mark as posted in the database.
    const { error: updateError } = await adminSupabase
      .from("youtube_comment_replies")
      .update({ status: "posted" })
      .eq("id", replyId);

    if (updateError) {
      console.error("[youtube/replies/post] Failed to mark reply as posted", {
        replyId,
        error: updateError,
      });
    }

    return apiSuccess({ replyId, status: "posted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to post reply";
    console.error("[youtube/replies/post] Error:", { error, message });
    return apiError("POST_REPLY_ERROR", message, 500);
  }
}
