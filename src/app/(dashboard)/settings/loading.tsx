import { Skeleton } from "@/components/ui/skeleton";
import {
  CardShellSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/loading-primitives";

/**
 * Instant skeleton shown while the Settings server component fetches credentials.
 * Mirrors the two-column SettingsShell layout so there's no layout shift on load.
 */
export default function SettingsLoading() {
  return (
    <div className="flex gap-0 min-h-[calc(100vh-10rem)]">
      {/* Sidebar skeleton */}
      <aside className="w-56 shrink-0 border-r border-border pr-1 mr-8 space-y-6">
        {[["Account", 2], ["Integrations", 3]].map(([heading, count]) => (
          <div key={heading as string}>
            <Skeleton className="h-2.5 w-16 mb-3" />
            <div className="space-y-0.5">
              {Array.from({ length: count as number }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                  <Skeleton className="w-3.5 h-3.5 rounded shrink-0" />
                  <Skeleton className="h-3 rounded flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 min-w-0">
        <div className="mb-6 pb-5 border-b border-border">
          <PageHeaderSkeleton
            titleWidthClass="w-44"
            subtitleWidthClass="w-64"
            className="mb-0"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <CardShellSkeleton key={i} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </CardShellSkeleton>
          ))}
        </div>
      </main>
    </div>
  );
}
