import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-background text-text-muted">
        <Icon className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
