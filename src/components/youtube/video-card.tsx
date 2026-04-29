import Link from "next/link";
import type { YouTubeVideo } from "@/services/platforms/youtube/youtube.types";

interface VideoCardProps {
  video: YouTubeVideo;
}

/**
 * Formats a duration in seconds to YouTube-style (e.g. 4:32, 1:02:15).
 */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Compact YouTube-style video card: 16:9 thumbnail with overlaid duration,
 * title, and view/comment stats below. Links to the video's automation page.
 */
export function VideoCard({ video }: VideoCardProps) {
  const duration = formatDuration(video.duration_seconds);

  return (
    <Link
      href={`/youtube/videos/${video.id}`}
      className="group flex flex-col gap-2 focus:outline-none"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
            No thumbnail
          </div>
        )}

        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-md leading-none">
            {duration}
          </span>
        )}

        {/* Shorts badge */}
        {video.is_short && (
          <span className="absolute top-1.5 left-1.5 bg-[#ff0000] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            Short
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="px-0.5">
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {video.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          {video.view_count.toLocaleString()} views &bull;{" "}
          {video.comment_count.toLocaleString()} comments
        </p>
      </div>
    </Link>
  );
}
