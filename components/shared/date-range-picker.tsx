"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Period filter (PRD §6.3 "Date Range Picker"). Plain date inputs — no calendar/popover in the Phase 0 UI kit. */
export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  className,
}: {
  from: string | undefined;
  to: string | undefined;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center",
        className,
      )}
    >
      <Input
        type="date"
        value={from ?? ""}
        onChange={(event) => onFromChange(event.target.value || undefined)}
        aria-label="Dari tanggal"
        className="w-full sm:w-auto"
      />
      <span className="hidden text-sm text-muted sm:inline">—</span>
      <Input
        type="date"
        value={to ?? ""}
        onChange={(event) => onToChange(event.target.value || undefined)}
        aria-label="Sampai tanggal"
        className="w-full sm:w-auto"
      />
    </div>
  );
}
