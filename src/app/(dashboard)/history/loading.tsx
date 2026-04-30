import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/loading-primitives";

/**
 * Instant skeleton shown while the Post History server component fetches
 * the list of published posts.
 */
export default function HistoryLoading() {
  const headerWidths: string[] = ["w-[120px]", "w-[80px]", "w-[100px]", "w-[60px]", "w-[80px]"];

  return (
    <div className="space-y-6">
      <PageHeaderSkeleton
        titleWidthClass="w-32"
        subtitleWidthClass="w-56"
        className="mb-0"
      />

      {/* Table skeleton */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-surface-elevated">
          {headerWidths.map((widthClass, i) => (
            <Skeleton key={i} className={`h-3 rounded ${widthClass}`} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-border last:border-0">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
