import { type NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { resolveUserId } from "@/lib/api-auth";
import { OAuthConnectionService } from "@/services/oauth/oauth-connection.service";
import { YouTubeService } from "@/services/platforms/youtube/youtube.service";
import { DEFAULT_YOUTUBE_VIDEO_PAGE_SIZE } from "@/services/platforms/youtube/youtube.constants";
import type { YouTubeVideo } from "@/services/platforms/youtube/youtube.types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Our cursor encodes both the raw YouTube pageToken and the current page number
 * so callers get clean pagination metadata without needing to track state.
 */
interface CursorPayload {
  ytToken: string | null;
  page: number;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8")) as CursorPayload;
  } catch {
    return null;
  }
}

/**
 * Returns a page of the authenticated user's YouTube videos.
 *
 * GET /api/v1/youtube/videos?maxResults=<n>&pageToken=<cursor>&filter=<long|short|all>
 *
 * Query params:
 *   maxResults  – Videos per page (1-50, default 15).
 *   pageToken   – Opaque cursor from the previous response's `nextPageToken`. Omit for page 1.
 *   filter      – "long" (regular videos, duration > 60s) | "short" (Shorts, ≤ 60s) | "all" (default).
 *
 * Accepts both Supabase session cookies and Bearer API keys.
 */
export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get("pageToken") ?? null;
  const maxResults = Math.min(
    Math.max(1, Number(searchParams.get("maxResults") ?? DEFAULT_YOUTUBE_VIDEO_PAGE_SIZE)),
    50
  );
  const filter = (searchParams.get("filter") ?? "all") as "long" | "short" | "all";
  if (!["long", "short", "all"].includes(filter)) {
    return apiError("VALIDATION_ERROR", 'filter must be "long", "short", or "all"', 400);
  }

  // Decode our cursor to get the raw YouTube token and current page number.
  let ytPageToken: string | undefined;
  let currentPage = 1;

  if (cursorParam) {
    const decoded = decodeCursor(cursorParam);
    if (!decoded) return apiError("VALIDATION_ERROR", "Invalid pageToken cursor", 400);
    ytPageToken = decoded.ytToken ?? undefined;
    currentPage = decoded.page;
  }

  try {
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

    const accessToken = await oauthService.getValidAccessToken(userId, "youtube");
    const youtubeService = new YouTubeService({
      access_token: accessToken,
      channel_id: connection.accountId,
    });

    // Fetch from YouTube in batches of 50 (max allowed per call) until we have
    // enough filtered results to fill the requested page. This fixes the bug
    // where filtering after a small fetch returns fewer items than maxResults.
    const collected: YouTubeVideo[] = [];
    let ytToken: string | undefined = ytPageToken;
    let lastYtNextToken: string | null = null;
    const MAX_YT_FETCHES = 5; // safety cap — 5 × 50 = 250 videos max per API call

    for (let i = 0; i < MAX_YT_FETCHES; i++) {
      const batch = await youtubeService.listVideos(50, ytToken);
      const filtered =
        filter === "all"
          ? batch.videos
          : batch.videos.filter((v) => (filter === "short" ? v.is_short : !v.is_short));

      collected.push(...filtered);
      lastYtNextToken = batch.nextPageToken;

      // Stop when we have enough, or YouTube has no more videos.
      if (collected.length >= maxResults || !batch.nextPageToken) {
        ytToken = batch.nextPageToken ?? undefined;
        break;
      }
      ytToken = batch.nextPageToken;
    }

    const videos = collected.slice(0, maxResults);
    const hasNextPage = collected.length > maxResults || lastYtNextToken !== null;

    // Enrich each video with transcript + automation status from the DB.
    const videoIds = videos.map((v) => v.id);
    const supabase = createAdminClient();

    const [{ data: dbVideos }, { data: dbRuns }] = await Promise.all([
      supabase
        .from("youtube_videos")
        .select("video_id, transcript_fetched_at")
        .eq("user_id", userId)
        .in("video_id", videoIds),
      supabase
        .from("youtube_automation_runs")
        .select("video_id, status, automation_completed_at, processed, queued, posted")
        .eq("user_id", userId)
        .eq("status", "completed")
        .in("video_id", videoIds),
    ]);

    const transcriptMap = new Map(
      (dbVideos ?? []).map((r) => [
        r.video_id as string,
        { has_transcript: Boolean(r.transcript_fetched_at) },
      ])
    );
    const runMap = new Map(
      (dbRuns ?? []).map((r) => [
        r.video_id as string,
        {
          automation_completed_at: r.automation_completed_at as string | null,
          processed: r.processed as number,
          queued: r.queued as number,
          posted: r.posted as number,
        },
      ])
    );

    const enrichedVideos = videos.map((v) => {
      const transcript = transcriptMap.get(v.id);
      const run = runMap.get(v.id);
      return {
        ...v,
        status: {
          in_db: transcriptMap.has(v.id),
          has_transcript: transcript?.has_transcript ?? false,
          automation_done: Boolean(run),
          automation_completed_at: run?.automation_completed_at ?? null,
          replies_processed: run?.processed ?? null,
          replies_queued: run?.queued ?? null,
          replies_posted: run?.posted ?? null,
        },
      };
    });

    // Build cursors. prevPageToken is null on page 1 — callers can't go back
    // further than that because YouTube's API is forward-only.
    const nextPageCursor = hasNextPage
      ? encodeCursor({ ytToken: ytToken ?? lastYtNextToken, page: currentPage + 1 })
      : null;

    const prevPageCursor = currentPage > 1
      ? encodeCursor({ ytToken: ytPageToken ?? null, page: currentPage - 1 })
      : null;

    return apiSuccess({
      videos: enrichedVideos,
      pagination: {
        currentPage,
        hasNextPage,
        hasPrevPage: currentPage > 1,
        nextPageToken: nextPageCursor,
        prevPageToken: prevPageCursor,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch YouTube videos.";
    console.error("YouTube videos API error", { userId, error: message });
    return apiError("YOUTUBE_VIDEOS_ERROR", message, 500);
  }
}
