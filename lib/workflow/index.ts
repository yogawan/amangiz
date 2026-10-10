import { unprocessable } from "@/lib/api/errors";

/**
 * Enforces a status-transition table (PRD 10.2).
 *
 * Rejecting a no-op transition is intentional: it surfaces double-submits
 * instead of silently reporting success for an action that did nothing.
 */
export function assertTransition<T extends string>(
  label: string,
  current: T,
  next: T,
  table: Record<T, readonly T[]>,
): void {
  if (current === next) {
    throw unprocessable(`${label} is already "${current}"`);
  }

  const allowed = table[current] ?? [];
  if (!allowed.includes(next)) {
    throw unprocessable(
      allowed.length === 0
        ? `${label} "${current}" is terminal and cannot transition to "${next}"`
        : `${label} cannot move from "${current}" to "${next}". Allowed: ${allowed.join(", ")}`,
    );
  }
}
