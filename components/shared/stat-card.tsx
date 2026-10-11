import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<StatTone, string> = {
  default: "bg-primary-light text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  href?: string;
  hint?: string;
  tone?: StatTone;
  className?: string;
}

/** Dashboard summary tile that links to the relevant detail page (PRD §6.4 #2). */
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  hint,
  tone = "default",
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card transition-colors",
        href && "hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted">{label}</p>
        {Icon && (
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
              TONE_CLASSES[tone],
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-[-.02em] text-foreground">
        {value}
      </p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
