import { Skeleton } from "@/components/ui/skeleton";
import {
  CardShellSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/loading-primitives";

/**
 * Instant skeleton shown while the video detail server component fetches
 * the transcript, automation config, and pending replies.
 * This is the most important loading.tsx — navigating to a video card
 * triggers a slow server fetch (transcript + DB queries).
 */
export default function VideoDetailLoading() {
  const transcriptWidths: string[] = ["w-[65%]", "w-[74%]", "w-[83%]", "w-[92%]"];

  return (
    <div className="space-y-8">
      <PageHeaderSkeleton
        titleWidthClass="w-64"
        subtitleWidthClass="w-40"
        className="mb-0"
      />

      {/* Transcript card */}
      <CardShellSkeleton className="p-6 space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-96" />
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-2.5 rounded ${transcriptWidths[i % transcriptWidths.length]}`}
            />
          ))}
        </div>
      </CardShellSkeleton>

      {/* Automation config card */}
      <CardShellSkeleton className="p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </CardShellSkeleton>

      {/* Comment replies card */}
      <CardShellSkeleton className="p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-1 border-b border-border pb-0">
          <div className="px-4 py-2">
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="px-4 py-2">
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-24 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </CardShellSkeleton>
    </div>
  );
}
