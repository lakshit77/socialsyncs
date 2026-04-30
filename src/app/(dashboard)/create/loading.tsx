import { Skeleton } from "@/components/ui/skeleton";
import {
  CardShellSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/loading-primitives";

/**
 * Instant skeleton shown while the Create Post server component fetches
 * available platforms and gallery media.
 */
export default function CreatePostLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeaderSkeleton
        titleWidthClass="w-32"
        subtitleWidthClass="w-56"
        className="mb-0"
      />

      {/* Post type grid */}
      <CardShellSkeleton>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-elevated">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      </CardShellSkeleton>
    </div>
  );
}
