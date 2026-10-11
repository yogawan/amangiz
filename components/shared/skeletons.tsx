import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Deterministic keys for fixed-shape placeholders.
 *
 * These skeletons are Suspense fallbacks, so they render inside the
 * *prerendered* static shell — `cacheComponents: true` fails the build on any
 * value that can differ between renders there, which rules out
 * `crypto.randomUUID()`. A skeleton row has no data identity anyway, and
 * nothing reorders, so position is a legitimate key.
 */
function placeholderKeys(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

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

/** Placeholder for a filter/tab bar whose current values aren't known until the request. */
export function FilterBarSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4",
        className,
      )}
    >
      {placeholderKeys("filter", fields).map((key) => (
        <Skeleton key={key} className="h-10 w-full max-w-[10rem]" />
      ))}
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
  const rowKeys = placeholderKeys("row", rows);
  const columnKeys = placeholderKeys("col", columns);

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
