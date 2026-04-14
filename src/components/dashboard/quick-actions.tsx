import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Settings, Clock } from "lucide-react";

const actions = [
  {
    label: "Create Post",
    description: "Start a new social media post",
    href: "/create",
    icon: PlusCircle,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "View History",
    description: "See all your past posts",
    href: "/history",
    icon: Clock,
    color: "text-teal",
    bgColor: "bg-teal/10",
  },
  {
    label: "Settings",
    description: "Manage platform connections",
    href: "/settings",
    icon: Settings,
    color: "text-orange",
    bgColor: "bg-orange/10",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <div className="space-y-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors"
          >
            <div
              className={`w-9 h-9 rounded-lg ${action.bgColor} flex items-center justify-center`}
            >
              <action.icon
                size={16}
                strokeWidth={1.8}
                className={action.color}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {action.label}
              </p>
              <p className="text-xs text-text-muted">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
