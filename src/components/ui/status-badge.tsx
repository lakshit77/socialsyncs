import { Badge } from "./badge";
import type { PostStatus } from "@/types/database";

const statusConfig: Record<
  PostStatus,
  { label: string; variant: "default" | "success" | "warning" | "error" | "processing" }
> = {
  pending: { label: "Pending", variant: "default" },
  processing: { label: "Processing", variant: "processing" },
  finished: { label: "Ready", variant: "warning" },
  published: { label: "Published", variant: "success" },
  error: { label: "Failed", variant: "error" },
};

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
