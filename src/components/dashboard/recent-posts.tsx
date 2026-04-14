import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import {
  ImageIcon,
  Film,
  Video,
  Clapperboard,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import type { PostRow } from "@/types/database";

interface RecentPostsProps {
  posts: PostRow[];
}

const postTypeIcons: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  image: ImageIcon,
  story_image: Film,
  story_video: Video,
  reel: Clapperboard,
  carousel: LayoutGrid,
};

export function RecentPosts({ posts }: RecentPostsProps) {
  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
        </CardHeader>
        <div className="text-center py-8 text-text-muted text-sm">
          No posts yet. Create your first post to get started!
        </div>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Recent Posts</CardTitle>
          <Link
            href="/history"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium"
          >
            View all
            <ArrowRight size={12} strokeWidth={1.8} />
          </Link>
        </div>
      </div>

      <div>
        {posts.map((post, index) => {
          const Icon = postTypeIcons[post.post_type] ?? ImageIcon;
          return (
            <div
              key={post.id}
              className={`flex items-center justify-between px-6 py-3 ${
                index < posts.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={16}
                  strokeWidth={1.8}
                  className="text-text-muted"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {post.caption
                      ? post.caption.slice(0, 40) +
                        (post.caption.length > 40 ? "..." : "")
                      : `${post.post_type} post`}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(post.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <StatusBadge status={post.status} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
