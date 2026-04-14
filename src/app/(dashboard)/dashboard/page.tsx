import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentPosts } from "@/components/dashboard/recent-posts";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostRow } from "@/types/database";

async function DashboardData() {
  const supabase = await createClient();

  // Parallel data fetching (RSC pattern)
  const [postsResult, publishedResult, processingResult, errorResult] =
    await Promise.all([
      supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing"),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "error"),
    ]);

  const recentPosts = (postsResult.data as PostRow[]) ?? [];
  const totalPosts = recentPosts.length > 0
    ? (publishedResult.count ?? 0) +
      (processingResult.count ?? 0) +
      (errorResult.count ?? 0)
    : 0;

  return (
    <>
      <StatsCards
        totalPosts={totalPosts}
        publishedCount={publishedResult.count ?? 0}
        processingCount={processingResult.count ?? 0}
        errorCount={errorResult.count ?? 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <RecentPosts posts={recentPosts} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Overview of your social media activity
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
