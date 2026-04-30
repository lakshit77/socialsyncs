import { type NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { resolveUserId } from "@/lib/api-auth";
import { youtubeAutomateLatestSchema } from "@/lib/validators";
import { OAuthConnectionService, OAuthTokenExpiredError } from "@/services/oauth/oauth-connection.service";
import { YouTubeService } from "@/services/platforms/youtube/youtube.service";
import { CommentAutomationService } from "@/services/youtube/comment-automation.service";
import { createAdminClient } from "@/lib/supabase/admin";

interface VideoCandidate {
  video_id: string;
  title: string;
}

type VideoFilter = "all" | "long" | "short";

function matchesVideoFilter(isShort: boolean, filter: VideoFilter): boolean {
  if (filter === "all") return true;
  return filter === "short" ? isShort : !isShort;
}

/**
 * POST /api/v1/youtube/automate/latest
 *
 * Selects the newest unprocessed video(s) from youtube_videos, runs comment
 * automation on each, and returns per-video run results.
 *
 * "Unprocessed" means no completed automation run exists yet for that video.
 * Accepts both Supabase session cookies and Bearer API keys (n8n).
 *
 * Request body supports `filter`:
 * - "all"   => all videos (default)
 * - "long"  => regular long-form videos only
 * - "short" => Shorts only
 *
 * n8n example:
 *   POST /api/v1/youtube/automate/latest
 *   Authorization: Bearer ss_<your_api_key>
 *   { "maxVideos": 5, "runLimit": 1, "autoPostOverride": true }
 */
export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const body = await request.json().catch(() => ({}));
  const parsed = youtubeAutomateLatestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error.issues);
  }

  const { maxVideos, runLimit, requireTranscript, autoPostOverride, filter } = parsed.data;

  try {
    // Ensure the user's YouTube connection is active.
    const oauthService = new OAuthConnectionService();
    const connection = await oauthService.getConnection(userId, "youtube");
    if (!connection || connection.status !== "active") {
      return apiError(
        "YOUTUBE_NOT_CONNECTED",
        connection?.status === "expired"
          ? "Your YouTube connection has expired. Please reconnect from Settings."
          : "YouTube account not connected. Please connect from Settings.",
        400
      );
    }

    // Optionally sync latest videos from YouTube before picking candidates.
    const accessToken = await oauthService.getValidAccessToken(userId, "youtube");
    const youtube = new YouTubeService({
      access_token: accessToken,
      channel_id: connection.accountId,
    });

    const page = await youtube.listVideos(maxVideos);
    const filteredVideos = page.videos.filter((video) => matchesVideoFilter(video.is_short, filter));
    const supabase = createAdminClient();

    // Upsert fetched videos so youtube_videos is always up to date.
    for (const video of filteredVideos) {
      await supabase
        .from("youtube_videos")
        .upsert(
          {
            user_id: userId,
            video_id: video.id,
            title: video.title,
            thumbnail_url: video.thumbnail_url,
            published_at: video.published_at,
          },
          { onConflict: "user_id,video_id" }
        );
    }

    // Find videos that have no completed automation run yet.
    const videoIds = filteredVideos.map((v) => v.id);

    const { data: completedRuns } = await supabase
      .from("youtube_automation_runs")
      .select("video_id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .in("video_id", videoIds);

    const completedVideoIds = new Set((completedRuns ?? []).map((r) => r.video_id as string));

    // Build ordered candidate list (newest-first from listVideos ordering).
    let candidates: VideoCandidate[] = filteredVideos
      .filter((v) => !completedVideoIds.has(v.id))
      .map((v) => ({ video_id: v.id, title: v.title }));

    if (requireTranscript) {
      const { data: videoRows } = await supabase
        .from("youtube_videos")
        .select("video_id, transcript")
        .eq("user_id", userId)
        .in("video_id", candidates.map((c) => c.video_id));

      const withTranscript = new Set(
        (videoRows ?? [])
          .filter((r) => Boolean((r as { transcript: string | null }).transcript))
          .map((r) => (r as { video_id: string }).video_id)
      );

      candidates = candidates.filter((c) => withTranscript.has(c.video_id));
    }

    const selected = candidates.slice(0, runLimit);

    if (selected.length === 0) {
      return apiSuccess({
        message: "No unprocessed videos found matching the criteria.",
        runs: [],
      });
    }

    const automationService = new CommentAutomationService();
    const runs = [];

    for (const candidate of selected) {
      try {
        const summary = await automationService.runAutomation(userId, candidate.video_id, {
          autoPostOverride,
        });
        runs.push({
          videoId: candidate.video_id,
          title: candidate.title,
          status: "completed",
          ...summary,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Run failed";
        runs.push({
          videoId: candidate.video_id,
          title: candidate.title,
          status: "failed",
          error: message,
        });
      }
    }

    return apiSuccess({ runs });
  } catch (error) {
    if (error instanceof OAuthTokenExpiredError) {
      return apiError("RECONNECT_REQUIRED", error.message, 401, {
        reconnectUrl: error.reconnectUrl,
      });
    }
    const message = error instanceof Error ? error.message : "Failed to run latest automation";
    console.error("[youtube/automate/latest] error", { userId, error: message });
    return apiError("YOUTUBE_AUTOMATION_ERROR", message, 500);
  }
}
