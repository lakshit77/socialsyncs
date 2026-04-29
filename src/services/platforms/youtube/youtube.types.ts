export interface YouTubeCredentials {
  access_token: string;
  channel_id: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  comment_count: number;
  /** Video duration in seconds parsed from ISO 8601 (e.g. PT4M32S → 272). */
  duration_seconds: number;
  /** True when duration_seconds ≤ 60 — YouTube Shorts threshold. */
  is_short: boolean;
}

/** A page of videos returned by listVideos(), with an optional token for the next page. */
export interface YouTubeVideosPage {
  videos: YouTubeVideo[];
  /** Pass this token to the next listVideos() call to fetch the following page. Null on last page. */
  nextPageToken: string | null;
}

export interface YouTubeComment {
  id: string;
  text: string;
  author_name: string | null;
  published_at: string | null;
}

export interface YouTubeCommentsPage {
  comments: YouTubeComment[];
  nextPageToken: string | null;
}

export interface YouTubeAIDecision {
  should_reply: boolean;
  reply: string | null;
  timestamp_reference: string | null;
}
