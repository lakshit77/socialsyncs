import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/loading-primitives";

/**
 * Instant skeleton shown while the YouTube videos list server component
 * fetches the first page of videos from the YouTube API.
 */
export default function YouTubeVideosLoading() {
  return (
    <div>
      <PageHeaderSkeleton titleWidthClass="w-44" subtitleWidthClass="w-72" />

      {/* Tab bar skeleton */}
      <div className="flex gap-1 border-b border-border mb-6">
        {["All Videos", "Long-form", "Shorts"].map((label) => (
          <div key={label} className="px-4 py-2.5">
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>

      {/* Video grid skeleton — 4-column on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="w-full aspect-video rounded-xl" />
            <div className="px-0.5 space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
