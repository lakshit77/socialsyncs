"use client";

import { useState, useTransition } from "react";
import { VideoCard } from "./video-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { YouTubeVideo, YouTubeVideosPage } from "@/services/platforms/youtube/youtube.types";

type Tab = "all" | "long" | "shorts";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Videos" },
  { id: "long", label: "Long-form" },
  { id: "shorts", label: "Shorts" },
];

interface VideoGridProps {
  initialVideos: YouTubeVideo[];
  initialNextPageToken: string | null;
}

/**
 * Client component that renders the tabbed video grid with Load More pagination.
 *
 * - Tabs (All / Long-form / Shorts) filter in the browser — no extra API calls.
 * - "Load More" fetches the next page from /api/v1/youtube/videos and appends results.
 * - The current active tab filter is applied to the accumulated video list.
 */
export function VideoGrid({ initialVideos, initialNextPageToken }: VideoGridProps) {
  const [allVideos, setAllVideos] = useState<YouTubeVideo[]>(initialVideos);
  const [nextPageToken, setNextPageToken] = useState<string | null>(initialNextPageToken);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore(): void {
    if (!nextPageToken || isPending) return;
    setLoadError(null);

    startTransition(async () => {
      try {
        const url = new URL("/api/v1/youtube/videos", window.location.origin);
        url.searchParams.set("pageToken", nextPageToken);

        const response = await fetch(url.toString());
        const json = (await response.json()) as {
          success: boolean;
          data?: YouTubeVideosPage;
          error?: { message: string };
        };

        if (!response.ok || !json.success || !json.data) {
          setLoadError(json.error?.message ?? "Failed to load more videos. Please try again.");
          return;
        }

        setAllVideos((prev) => [...prev, ...json.data!.videos]);
        setNextPageToken(json.data.nextPageToken);
      } catch {
        setLoadError("Network error. Please check your connection and try again.");
      }
    });
  }

  /** Videos visible under the active tab. */
  const filteredVideos = allVideos.filter((v) => {
    if (activeTab === "long") return !v.is_short;
    if (activeTab === "shorts") return v.is_short;
    return true;
  });

  const shortsCount = allVideos.filter((v) => v.is_short).length;
  const longCount = allVideos.filter((v) => !v.is_short).length;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const count =
            tab.id === "all" ? allVideos.length : tab.id === "shorts" ? shortsCount : longCount;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-xs rounded-full px-1.5 py-0.5 font-medium",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "bg-surface text-text-muted"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Video grid */}
      {filteredVideos.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">
          {activeTab === "shorts"
            ? "No Shorts found in the loaded videos."
            : activeTab === "long"
            ? "No long-form videos found in the loaded videos."
            : "No videos found. Check your YouTube connection or publish a video first."}
          {allVideos.length > 0 && nextPageToken && (
            <span> Try loading more videos below.</span>
          )}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* Load More / error */}
      {loadError && (
        <p className="text-sm text-error text-center">{loadError}</p>
      )}

      {nextPageToken && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            loading={isPending}
          >
            {isPending ? "Loading…" : "Load More Videos"}
          </Button>
        </div>
      )}

      {!nextPageToken && allVideos.length > 0 && (
        <p className="text-xs text-text-muted text-center pt-2">
          All {allVideos.length} videos loaded
        </p>
      )}
    </div>
  );
}
