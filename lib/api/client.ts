/**
 * Client-side fetch helper for `/api/v1/*`, mirroring the envelope produced by
 * lib/api/response.ts: `{success,data,meta}` or `{success,error:{code,message,details}}`.
 *
 * Used by Client Components to write (the hybrid data-flow decision in
 * UI_PLAN.md §0: Server Components read via services/*.service.ts directly,
 * Client Components write through this against the existing route handlers).
 */

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(
    status: number,
    code: string,
    message: string,
    details: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown[] };
}

type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export interface ApiResult<T> {
  data: T;
  meta: Record<string, unknown>;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat menghubungi server. Periksa koneksi Anda.",
    );
  }

  // A malformed/empty body (e.g. a 204 or a proxy error page) must not crash
  // the caller — it's reported the same way as a server-declared error.
  let payload: Envelope<T> | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload.error : null;
    throw new ApiClientError(
      response.status,
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? "Terjadi kesalahan yang tidak terduga.",
      error?.details ?? [],
    );
  }

  return { data: payload.data, meta: payload.meta ?? {} };
}

export function apiGet<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  return request<T>(path, { ...init, method: "GET" });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  return request<T>(path, {
    ...init,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  return request<T>(path, {
    ...init,
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  return request<T>(path, { ...init, method: "DELETE" });
}
