import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

interface PageHeaderSkeletonProps {
  titleWidthClass: string;
  subtitleWidthClass: string;
  className?: string;
}

/**
 * Reusable page header skeleton used across dashboard route loading states.
 */
export function PageHeaderSkeleton({
  titleWidthClass,
  subtitleWidthClass,
  className = "mb-8",
}: PageHeaderSkeletonProps) {
  return (
    <div className={className}>
      <Skeleton className={`h-7 ${titleWidthClass} mb-2`} />
      <Skeleton className={`h-3.5 ${subtitleWidthClass}`} />
    </div>
  );
}

interface CardShellSkeletonProps {
  children: ReactNode;
  className?: string;
}

/**
 * Reusable card container skeleton to avoid repeating border/surface classes.
 */
export function CardShellSkeleton({ children, className = "" }: CardShellSkeletonProps) {
  return (
    <div className={`rounded-xl border border-border bg-surface-elevated p-5 ${className}`}>
      {children}
    </div>
  );
}
