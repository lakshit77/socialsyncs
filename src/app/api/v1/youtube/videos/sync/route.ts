import { type NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { resolveUserId } from "@/lib/api-auth";
import { youtubeSyncSchema } from "@/lib/validators";
import { OAuthConnectionService } from "@/services/oauth/oauth-connection.service";
import { YouTubeService } from "@/services/platforms/youtube/youtube.service";
import { createAdminClient } from "@/lib/supabase/admin";

interface SyncResult {
  inserted: string[];
  updated: string[];
  transcriptsFetched: string[];
  skippedNoTranscript: string[];
}

/**
 * POST /api/v1/youtube/videos/sync
 *
 * Upserts the latest N videos from the user's channel into youtube_videos,
 * optionally fetching transcripts for rows that are missing them.
 * Accepts both Supabase session cookies and Bearer API keys.
 */
export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const body = await request.json().catch(() => ({}));
  const parsed = youtubeSyncSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error.issues);
  }

  const { maxVideos, fetchTranscript, skipIfNoCaptions } = parsed.data;

  try {
    const oauthService = new OAuthConnectionService();
    const connection = await oauthService.getConnection(userId, "youtube");

    if (!connection || connection.status !== "active") {
      return apiError(
        "YOUTUBE_NOT_CONNECTED",
        connection?.status === "expired"
          ? "Your YouTube connection has expired. Please reconnect from Settings."
          : "YouTube account not connected. Please connect from Settings.",
        400,
        { resolvedUserId: userId, connectionStatus: connection?.status ?? "not_found" }
      );
    }

    const accessToken = await oauthService.getValidAccessToken(userId, "youtube");
    const youtube = new YouTubeService({
      access_token: accessToken,
      channel_id: connection.accountId,
    });

    const page = await youtube.listVideos(maxVideos);
    const supabase = createAdminClient();
    const result: SyncResult = {
      inserted: [],
      updated: [],
      transcriptsFetched: [],
      skippedNoTranscript: [],
    };

    for (const video of page.videos) {
      // Upsert video metadata.
      const { data: existing } = await supabase
        .from("youtube_videos")
        .select("id, transcript")
        .eq("user_id", userId)
        .eq("video_id", video.id)
        .maybeSingle<{ id: string; transcript: string | null }>();

      const videoPayload = {
        user_id: userId,
        video_id: video.id,
        title: video.title,
        thumbnail_url: video.thumbnail_url,
        published_at: video.published_at,
      };

      if (existing) {
        await supabase
          .from("youtube_videos")
          .update(videoPayload)
          .eq("user_id", userId)
          .eq("video_id", video.id);
        result.updated.push(video.id);
      } else {
        await supabase.from("youtube_videos").insert(videoPayload);
        result.inserted.push(video.id);
      }

      // Fetch transcript if missing and requested.
      const hasTranscript = Boolean(existing?.transcript);
      if (fetchTranscript && !hasTranscript) {
        const transcript = await oauthService.withTokenAutoRefresh(
          userId,
          "youtube",
          (token) => {
            youtube.updateAccessToken(token);
            return youtube.fetchTranscript(video.id);
          }
        );

        if (transcript) {
          await supabase
            .from("youtube_videos")
            .update({
              transcript,
              transcript_fetched_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("video_id", video.id);
          result.transcriptsFetched.push(video.id);
        } else if (!skipIfNoCaptions) {
          result.skippedNoTranscript.push(video.id);
        }
      }
    }

    return apiSuccess({
      totalVideos: page.videos.length,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[youtube/videos/sync] error", { userId, error: message });
    return apiError("YOUTUBE_SYNC_ERROR", message, 500);
  }
}
