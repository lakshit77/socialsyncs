import { Skeleton } from "@/components/ui/skeleton";
import {
  CardShellSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/loading-primitives";

/**
 * Instant skeleton shown while the dashboard server component fetches stats
 * and recent posts in parallel.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton
        titleWidthClass="w-48"
        subtitleWidthClass="w-64"
        className="mb-0"
      />

      {/* Stats cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardShellSkeleton key={i} className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28" />
          </CardShellSkeleton>
        ))}
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent posts */}
        <CardShellSkeleton className="lg:col-span-2 space-y-4">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardShellSkeleton>

        {/* Quick actions */}
        <CardShellSkeleton className="space-y-3">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </CardShellSkeleton>
      </div>
    </div>
  );
}
