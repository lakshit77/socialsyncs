import { type NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { resolveUserId } from "@/lib/api-auth";
import { youtubeAutomateSchema } from "@/lib/validators";
import { CommentAutomationService } from "@/services/youtube/comment-automation.service";
import { OAuthTokenExpiredError } from "@/services/oauth/oauth-connection.service";

/**
 * Starts a one-time YouTube comment automation run for a selected video.
 * Accepts both Supabase session cookies and Bearer API keys.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return apiError("UNAUTHORIZED", "Authentication required", 401);

    const body = await request.json();
    const parsed = youtubeAutomateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.issues
      );
    }

    const automationService = new CommentAutomationService();
    const summary = await automationService.runAutomation(userId, parsed.data.videoId);

    return apiSuccess(summary);
  } catch (error) {
    if (error instanceof OAuthTokenExpiredError) {
      return apiError("RECONNECT_REQUIRED", error.message, 401, {
        reconnectUrl: error.reconnectUrl,
      });
    }
    const message =
      error instanceof Error ? error.message : "Failed to run YouTube automation";
    console.error("[youtube/automate] Automation run failed:", {
      error,
      message,
    });
    return apiError("YOUTUBE_AUTOMATION_ERROR", message, 500);
  }
}
