"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiClientError } from "./client";

/**
 * Wraps a write call to `/api/v1/*` with the loading/error/toast/refresh
 * boilerplate every create/edit/action form in this app repeats: on success,
 * toast and `router.refresh()` so the Server Component list picks up the
 * change (UI_PLAN.md §0 mutation pattern — no extra state library). On
 * failure, surfaces the server's own error message rather than a generic one.
 */
export function useMutation<T>(mutationFn: () => Promise<T>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(options?: {
    successMessage?: string;
  }): Promise<T | undefined> {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn();
      if (options?.successMessage) toast.success(options.successMessage);
      router.refresh();
      return result;
    } catch (caught) {
      const message =
        caught instanceof ApiClientError
          ? caught.message
          : "Terjadi kesalahan yang tidak terduga.";
      setError(message);
      toast.error(message);
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, error, setError };
}
