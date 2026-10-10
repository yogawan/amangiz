import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Tone per workflow status across every model that has one (PRD §7: FoodBatch,
 * Distribution, Incident, Investigation, Supplier, plus the generic
 * active/inactive/suspended used by User/SPPG/School).
 */
const STATUS_TONE: Record<string, StatusTone> = {
  active: "success",
  inactive: "neutral",
  suspended: "warning",
  draft: "neutral",
  prepared: "info",
  released: "success",
  on_hold: "warning",
  recalled: "danger",
  completed: "success",
  planned: "neutral",
  dispatched: "info",
  in_transit: "info",
  delivered: "success",
  delayed: "warning",
  cancelled: "danger",
  reported: "neutral",
  triaged: "info",
  containment_in_progress: "warning",
  under_investigation: "warning",
  resolved: "success",
  closed: "neutral",
  pending: "neutral",
  in_progress: "info",
  awaiting_external_result: "warning",
  verified: "success",
  rejected: "danger",
};

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-text-secondary",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

function defaultLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label ?? defaultLabel(status)}
    </span>
  );
}
