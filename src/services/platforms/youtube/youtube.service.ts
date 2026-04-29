import {
  DEFAULT_YOUTUBE_COMMENTS_PAGE_SIZE,
  DEFAULT_YOUTUBE_VIDEO_PAGE_SIZE,
  YT_API_BASE,
  YT_CAPTIONS_DOWNLOAD_BASE,
} from "./youtube.constants";
import type {
  YouTubeComment,
  YouTubeCommentsPage,
  YouTubeCredentials,
  YouTubeVideo,
  YouTubeVideosPage,
} from "./youtube.types";

interface YouTubeApiErrorPayload {
  error?: {
    message?: string;
  };
}

interface YouTubePlaylistItemsResponse {
  nextPageToken?: string;
  items?: Array<{
    contentDetails?: {
      videoId?: string;
    };
  }>;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: {
        maxres?: { url?: string };
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    statistics?: {
      viewCount?: string;
      commentCount?: string;
    };
    contentDetails?: {
      /** ISO 8601 duration, e.g. "PT4M32S". */
      duration?: string;
    };
    status?: {
      /** "public" | "private" | "unlisted" */
      privacyStatus?: string;
      /** "processed" | "uploaded" | "failed" | "rejected" | "deleted" */
      uploadStatus?: string;
    };
  }>;
}

interface YouTubeChannelsContentDetailsResponse {
  items?: Array<{
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
}

interface YouTubeCommentsResponse {
  nextPageToken?: string;
  items?: Array<{
    id?: string;
    snippet?: {
      topLevelComment?: {
        id?: string;
        snippet?: {
          textDisplay?: string;
          authorDisplayName?: string;
          publishedAt?: string;
        };
      };
    };
    replies?: {
      comments?: Array<{
        snippet?: {
          authorChannelId?: { value?: string };
        };
      }>;
    };
  }>;
}

interface YouTubeCaptionsResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      language?: string;
      trackKind?: string;
    };
  }>;
}

interface YouTubeChannelsResponse {
  items?: Array<{
    snippet?: {
      title?: string;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
}

export class YouTubeApiError extends Error {
  public statusCode: number;

  public payload?: unknown;

  constructor(message: string, statusCode: number, payload?: unknown) {
    super(message);
    this.name = "YouTubeApiError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

/**
 * Wraps YouTube Data API operations required for comment automation.
 */
export class YouTubeService {
  private channelId: string;

  private accessToken: string;

  constructor(credentials: YouTubeCredentials) {
    this.channelId = credentials.channel_id;
    this.accessToken = credentials.access_token;
  }

  /** Replaces the active access token, used by the OAuth auto-refresh wrapper. */
  updateAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Validates configured YouTube credentials and returns the connected channel title.
   */
  async validateCredentials(): Promise<{ channelTitle: string }> {
    const data = await this.apiGet<YouTubeChannelsResponse>("/channels", {
      part: "snippet",
      id: this.channelId,
    });
    const channelTitle = data.items?.[0]?.snippet?.title;
    if (!channelTitle) {
      throw new Error("Could not validate YouTube credentials for this channel");
    }

    return { channelTitle };
  }

  /**
   * Returns the channel's uploads playlist ID (cost: 1 quota unit).
   * Every channel has an auto-generated uploads playlist whose ID is the
   * channel ID with the leading "UC" replaced by "UU".
   * We derive it directly to avoid an extra API call.
   */
  private getUploadsPlaylistId(): string {
    if (!this.channelId.startsWith("UC")) {
      throw new Error(
        `Cannot derive uploads playlist ID: channel ID "${this.channelId}" does not start with "UC".`
      );
    }
    return `UU${this.channelId.slice(2)}`;
  }

  /**
   * Lists videos from the channel's uploads playlist using the playlistItems endpoint.
   *
   * Quota cost breakdown (vs the old /search approach):
   *   - OLD: /search = 100 units + /videos = 1 unit → 101 units per page
   *   - NEW: /playlistItems = 1 unit + /videos = 1 unit → 2 units per page
   *
   * @param maxResults - Number of videos per page (max 50).
   * @param pageToken  - Token for the next page, returned by the previous call.
   */
  async listVideos(
    maxResults: number = DEFAULT_YOUTUBE_VIDEO_PAGE_SIZE,
    pageToken?: string
  ): Promise<YouTubeVideosPage> {
    const uploadsPlaylistId = this.getUploadsPlaylistId();

    // Step 1: get video IDs from the uploads playlist (1 quota unit).
    const playlistData = await this.apiGet<YouTubePlaylistItemsResponse>("/playlistItems", {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(maxResults, 50)),
      ...(pageToken ? { pageToken } : {}),
    });

    const ids = (playlistData.items ?? [])
      .map((item) => item.contentDetails?.videoId)
      .filter((id): id is string => Boolean(id));

    if (ids.length === 0) {
      return { videos: [], nextPageToken: null };
    }

    // Step 2: fetch full video details including duration and publish status (1 quota unit).
    const videosData = await this.apiGet<YouTubeVideosResponse>("/videos", {
      part: "snippet,statistics,contentDetails,status",
      id: ids.join(","),
    });

    const videos: YouTubeVideo[] = (videosData.items ?? [])
      // Only include fully processed, publicly visible videos.
      // Excludes: private, unlisted, scheduled (publishAt in future = private),
      // still-uploading (uploadStatus = "uploaded"), failed, rejected, and deleted.
      .filter((item) => {
        const s = item.status;
        if (!s) return false;
        if (s.privacyStatus !== "public") return false;
        if (s.uploadStatus !== "processed") return false;
        return true;
      })
      .map((item) => {
      const snippet = item.snippet;
      const thumbnail =
        snippet?.thumbnails?.maxres?.url ??
        snippet?.thumbnails?.high?.url ??
        snippet?.thumbnails?.medium?.url ??
        snippet?.thumbnails?.default?.url ??
        null;

      const durationSeconds = parseIsoDuration(item.contentDetails?.duration ?? "");

      return {
        id: item.id ?? "",
        title: snippet?.title ?? "Untitled video",
        thumbnail_url: thumbnail,
        published_at: snippet?.publishedAt ?? null,
        view_count: Number(item.statistics?.viewCount ?? "0"),
        comment_count: Number(item.statistics?.commentCount ?? "0"),
        duration_seconds: durationSeconds,
        is_short: durationSeconds > 0 && durationSeconds <= 60,
      };
    });

    return {
      videos,
      nextPageToken: playlistData.nextPageToken ?? null,
    };
  }

  /**
   * Retrieves available captions and returns transcript text when available.
   */
  async fetchTranscript(videoId: string): Promise<string | null> {
    const captions = await this.apiGet<YouTubeCaptionsResponse>("/captions", {
      part: "snippet",
      videoId,
    });

    const englishTrack =
      (captions.items ?? []).find((item) => item.snippet?.language === "en") ??
      captions.items?.[0];
    if (!englishTrack?.id) {
      return null;
    }

    const transcript = await this.downloadCaptionTrack(englishTrack.id);
    return transcript || null;
  }

  /**
   * Fetches top-level comments for a video and returns a pagination token.
   */
  async fetchComments(
    videoId: string,
    pageToken?: string
  ): Promise<YouTubeCommentsPage> {
    // Include "replies" so we can detect threads where the channel owner
    // already replied manually and skip them.
    const data = await this.apiGet<YouTubeCommentsResponse>("/commentThreads", {
      part: "snippet,replies",
      videoId,
      order: "time",
      textFormat: "plainText",
      maxResults: String(DEFAULT_YOUTUBE_COMMENTS_PAGE_SIZE),
      ...(pageToken ? { pageToken } : {}),
    });

    const comments: YouTubeComment[] = (data.items ?? [])
      .filter((item) => {
        // Skip threads where the authenticated channel has already replied.
        const existingReplies = item.replies?.comments ?? [];
        const alreadyReplied = existingReplies.some(
          (reply) => reply.snippet?.authorChannelId?.value === this.channelId
        );
        return !alreadyReplied;
      })
      .map((item) => {
        const topComment = item.snippet?.topLevelComment;
        return {
          id: topComment?.id ?? "",
          text: topComment?.snippet?.textDisplay ?? "",
          author_name: topComment?.snippet?.authorDisplayName ?? null,
          published_at: topComment?.snippet?.publishedAt ?? null,
        };
      })
      .filter((item) => item.id.length > 0 && item.text.length > 0);

    return {
      comments,
      nextPageToken: data.nextPageToken ?? null,
    };
  }

  /**
   * Posts a reply to a top-level comment thread.
   * `part` must be a query parameter — not in the body.
   */
  async postReply(parentId: string, text: string): Promise<void> {
    await this.apiPost(
      "/comments?part=snippet",
      {
        snippet: {
          parentId,
          textOriginal: text,
        },
      }
    );
  }

  /**
   * Marks a comment as published through moderation endpoint.
   */
  async likeComment(commentId: string): Promise<void> {
    await this.apiPost("/comments/setModerationStatus", {
      id: commentId,
      moderationStatus: "published",
    });
  }

  private async downloadCaptionTrack(captionId: string): Promise<string> {
    const url = new URL(`${YT_CAPTIONS_DOWNLOAD_BASE}/${captionId}`);
    url.searchParams.set("tfmt", "srt");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    const data = await response.text();
    if (!response.ok) {
      throw new YouTubeApiError(
        "Failed to download YouTube caption track",
        response.status,
        data
      );
    }

    return data;
  }

  private async apiGet<T>(
    path: string,
    queryParams: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${YT_API_BASE}${path}`);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    const data = (await response.json()) as T & YouTubeApiErrorPayload;
    if (!response.ok) {
      throw new YouTubeApiError(
        data.error?.message ?? "YouTube API GET request failed",
        response.status,
        data
      );
    }

    return data as T;
  }

  private async apiPost<T>(
    path: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${YT_API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Some YouTube POST endpoints return an empty body (e.g. 204 No Content).
    // Parse JSON only when there's actual content.
    const rawText = await response.text();
    const data = (rawText ? (JSON.parse(rawText) as unknown) : {}) as T & YouTubeApiErrorPayload;

    if (!response.ok) {
      throw new YouTubeApiError(
        (data as YouTubeApiErrorPayload).error?.message ??
          "YouTube API POST request failed",
        response.status,
        rawText || data
      );
    }

    return data as T;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses an ISO 8601 duration string (e.g. "PT4M32S", "PT1H2M3S", "PT45S")
 * into a total number of seconds.
 *
 * @param iso - The ISO 8601 duration string from the YouTube API.
 * @returns Total duration in seconds, or 0 if parsing fails.
 */
function parseIsoDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}
