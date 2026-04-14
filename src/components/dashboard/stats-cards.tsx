import { Card } from "@/components/ui/card";
import {
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface StatsCardsProps {
  totalPosts: number;
  publishedCount: number;
  processingCount: number;
  errorCount: number;
}

const stats = [
  {
    key: "total",
    label: "Total Posts",
    icon: Send,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "published",
    label: "Published",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    key: "processing",
    label: "Processing",
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    key: "errors",
    label: "Failed",
    icon: AlertTriangle,
    color: "text-error",
    bgColor: "bg-error/10",
  },
] as const;

export function StatsCards({
  totalPosts,
  publishedCount,
  processingCount,
  errorCount,
}: StatsCardsProps) {
  const values: Record<string, number> = {
    total: totalPosts,
    published: publishedCount,
    processing: processingCount,
    errors: errorCount,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.key}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}
            >
              <stat.icon size={18} strokeWidth={1.8} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] text-foreground">
                {values[stat.key]}
              </p>
              <p className="text-xs text-text-muted">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
