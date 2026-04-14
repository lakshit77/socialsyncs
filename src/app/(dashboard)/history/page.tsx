import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { HistoryTable } from "@/components/post-history/history-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostRow } from "@/types/database";

async function PostHistoryData() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return <HistoryTable initialPosts={(posts as PostRow[]) ?? []} />;
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-surface px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-border">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
          Post History
        </h1>
        <p className="text-sm text-text-muted mt-1">
          View and track all your published and pending posts
        </p>
      </div>

      <Suspense fallback={<HistorySkeleton />}>
        <PostHistoryData />
      </Suspense>
    </div>
  );
}
