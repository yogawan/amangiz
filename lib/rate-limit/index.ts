import { ApiError, ErrorCode } from "@/lib/api/errors";

/**
 * Minimal fixed-window limiter for credential endpoints (PRD 8.1 lists 429).
 *
 * LIMITATION: state lives in the process, so it only throttles per instance and
 * resets on redeploy. It raises the cost of online password guessing but is not
 * a distributed rate limiter — move this to Redis or an edge rate limiter
 * before relying on it in production.
 */

interface Window {
  count: number;
  resetAt: number;
}

declare global {
  var _amangizRateLimit: Map<string, Window> | undefined;
}

const buckets: Map<string, Window> =
  globalThis._amangizRateLimit ?? new Map<string, Window>();
globalThis._amangizRateLimit = buckets;

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    throw new ApiError(
      429,
      ErrorCode.RATE_LIMITED,
      `Too many attempts. Try again in ${retryAfter} second(s).`,
    );
  }

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 10_000) {
    for (const [bucketKey, window] of buckets) {
      if (window.resetAt <= now) buckets.delete(bucketKey);
    }
  }
}

/** Best-effort client identity for throttling, from proxy headers. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${scope}:${ip}`;
}
