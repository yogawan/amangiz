import { Inbox, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  image,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  image?: string;
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
      {image ? (
        <Image
          src={image}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
        />
      ) : (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-background text-muted">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
