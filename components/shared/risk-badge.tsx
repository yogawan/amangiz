import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high" | "critical";

const RISK_LEVEL_CLASSES: Record<RiskLevel, string> = {
  low: "bg-risk-low/10 text-risk-low",
  medium: "bg-risk-medium/10 text-risk-medium",
  high: "bg-risk-high/10 text-risk-high",
  critical: "bg-risk-critical/10 text-risk-critical",
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/**
 * Risk level indicator. Color is never the only signal (PRD §4.3: "Warna
 * risiko tidak boleh menjadi satu-satunya pembeda"), so the text label is
 * always rendered alongside it, never swapped for an icon-only chip.
 */
export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold tracking-wide uppercase",
        RISK_LEVEL_CLASSES[level],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
}
