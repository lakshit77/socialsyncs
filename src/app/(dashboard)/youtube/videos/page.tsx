// Always fetch fresh data — never serve a cached page.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OAuthConnectionService } from "@/services/oauth/oauth-connection.service";
import { YouTubeService } from "@/services/platforms/youtube/youtube.service";
import { DEFAULT_YOUTUBE_VIDEO_PAGE_SIZE } from "@/services/platforms/youtube/youtube.constants";
import { VideoGrid } from "@/components/youtube/video-grid";

/**
 * Server-side initial data fetch + shell for the YouTube videos listing page.
 * The first page is rendered on the server for instant display; subsequent pages
 * are loaded client-side via the VideoGrid component hitting /api/v1/youtube/videos.
 */
export default async function YouTubeVideosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
          YouTube Automation
        </h1>
        <p className="mt-2 text-sm text-text-muted">Sign in to load your YouTube videos.</p>
      </div>
    );
  }

  const oauthService = new OAuthConnectionService();
  const connection = await oauthService.getConnection(user.id, "youtube");

  if (!connection || connection.status !== "active") {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
          YouTube Automation
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {connection?.status === "expired"
            ? "Your YouTube connection has expired. "
            : "Connect YouTube first from Settings to browse your latest videos. "}
          <Link href="/settings" className="text-primary hover:text-primary-hover underline">
            Go to Settings
          </Link>
        </p>
      </div>
    );
  }

  // Server-fetch the first page for instant render (no loading spinner on initial load).
  let initialVideos = [];
  let initialNextPageToken: string | null = null;

  try {
    const accessToken = await oauthService.getValidAccessToken(user.id, "youtube");
    const youtubeService = new YouTubeService({
      access_token: accessToken,
      channel_id: connection.accountId,
    });
    const firstPage = await youtubeService.listVideos(DEFAULT_YOUTUBE_VIDEO_PAGE_SIZE);
    initialVideos = firstPage.videos;
    initialNextPageToken = firstPage.nextPageToken;
  } catch (error) {
    console.error("Failed to fetch initial YouTube videos", { userId: user.id, error });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
          YouTube Videos
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Select a video to configure transcript-backed comment automation
        </p>
      </div>

      <VideoGrid
        initialVideos={initialVideos}
        initialNextPageToken={initialNextPageToken}
      />
    </div>
  );
}
