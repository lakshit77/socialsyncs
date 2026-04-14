"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  ImageIcon,
  Film,
  Video,
  Clapperboard,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";
import type { PostRow, PostStatus } from "@/types/database";

interface HistoryTableProps {
  initialPosts: PostRow[];
}

const postTypeIcons: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  image: ImageIcon,
  story_image: Film,
  story_video: Video,
  reel: Clapperboard,
  carousel: LayoutGrid,
};

const postTypeLabels: Record<string, string> = {
  image: "Image",
  story_image: "Story (Image)",
  story_video: "Story (Video)",
  reel: "Reel",
  carousel: "Carousel",
};

const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|m4v)(\?|$)/i;

function isVideoPost(post: PostRow, primaryUrl: string): boolean {
  if (post.post_type === "reel" || post.post_type === "story_video") {
    return true;
  }
  return VIDEO_URL_PATTERN.test(primaryUrl);
}

function PostMediaPreview({ post }: { post: PostRow }) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const primary = post.media_urls?.[0];
  const Icon = postTypeIcons[post.post_type] ?? ImageIcon;
  const extraCount =
    post.post_type === "carousel" && post.media_urls.length > 1
      ? post.media_urls.length - 1
      : 0;

  const placeholder = (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
      <Icon size={22} className="text-text-muted" strokeWidth={1.8} />
    </div>
  );

  if (!primary || mediaFailed) {
    return placeholder;
  }

  if (isVideoPost(post, primary)) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-black">
        <video
          src={primary}
          poster={post.cover_url ?? undefined}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          onError={() => setMediaFailed(true)}
        />
        {extraCount > 0 && (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
            +{extraCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
      {/* Remote Supabase URLs; avoid next/image remotePatterns churn */}
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny table thumbs; dynamic Supabase host */}
      <img
        src={primary}
        alt={post.caption ? post.caption.slice(0, 80) : "Post preview"}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setMediaFailed(true)}
      />
      {extraCount > 0 && (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
          +{extraCount}
        </span>
      )}
    </div>
  );
}

export function HistoryTable({ initialPosts }: HistoryTableProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState<PostStatus | "all">("all");

  // Poll processing posts
  const pollProcessingPosts = useCallback(async () => {
    const processingPosts = posts.filter((p) => p.status === "processing");
    if (processingPosts.length === 0) return;

    const updates = await Promise.all(
      processingPosts.map(async (post) => {
        try {
          const res = await fetch(`/api/v1/posts/${post.id}`);
          const json = await res.json();
          if (json.success) return { id: post.id, ...json.data };
        } catch {
          // ignore individual failures
        }
        return null;
      })
    );

    setPosts((prev) =>
      prev.map((post) => {
        const update = updates.find((u) => u?.id === post.id || u?.post_id === post.id);
        if (update) {
          return {
            ...post,
            status: update.status,
            published_media_id: update.published_media_id,
            published_at: update.published_at,
            error_message: update.error_message,
          };
        }
        return post;
      })
    );
  }, [posts]);

  useEffect(() => {
    const hasProcessing = posts.some((p) => p.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(pollProcessingPosts, 5000);
    return () => clearInterval(interval);
  }, [posts, pollProcessingPosts]);

  const filteredPosts =
    filter === "all" ? posts : posts.filter((p) => p.status === filter);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(
          ["all", "published", "processing", "error", "pending"] as const
        ).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === status
                ? "bg-primary/10 text-primary"
                : "bg-surface text-text-muted hover:text-foreground"
            }`}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== "all" && (
              <span className="ml-1 text-text-muted">
                ({posts.filter((p) => p.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">
          {filter === "all"
            ? "No posts yet. Create your first post!"
            : `No ${filter} posts found.`}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted">
                  Media
                </th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">
                  Platform
                </th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">
                  Caption
                </th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-t border-border hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PostMediaPreview post={post} />
                        <span className="text-sm">
                          {postTypeLabels[post.post_type] ?? post.post_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{post.platform}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-muted truncate max-w-[200px] block">
                        {post.caption || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={post.status} />
                        {post.status === "processing" && (
                          <RefreshCw
                            size={12}
                            className="animate-spin text-primary"
                            strokeWidth={1.8}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatDate(post.created_at)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
