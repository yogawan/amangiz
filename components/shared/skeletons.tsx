import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card",
        className,
      )}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  // Keys are random rather than index-derived since this is a fixed-shape
  // placeholder with no real identity to key off of.
  const rowKeys = Array.from({ length: rows }, () =>
    globalThis.crypto.randomUUID(),
  );
  const columnKeys = Array.from({ length: columns }, () =>
    globalThis.crypto.randomUUID(),
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {columnKeys.map((key) => (
          <Skeleton key={key} className="h-3 flex-1" />
        ))}
      </div>
      {rowKeys.map((rowKey) => (
        <div
          key={rowKey}
          className="flex gap-4 border-b border-border px-4 py-3 last:border-0"
        >
          {columnKeys.map((colKey) => (
            <Skeleton key={`${rowKey}-${colKey}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
