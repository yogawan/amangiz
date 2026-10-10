/** Error codes surfaced in the `error.code` field of the response envelope. */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  UNPROCESSABLE: "UNPROCESSABLE",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCodeValue;
  readonly details?: unknown[];

  constructor(
    status: number,
    code: ErrorCodeValue,
    message: string,
    details?: unknown[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown[]) =>
  new ApiError(400, ErrorCode.VALIDATION_ERROR, message, details);

export const unauthenticated = (message = "Authentication is required") =>
  new ApiError(401, ErrorCode.UNAUTHENTICATED, message);

export const forbidden = (message = "You do not have permission") =>
  new ApiError(403, ErrorCode.FORBIDDEN, message);

export const notFound = (message = "Resource not found") =>
  new ApiError(404, ErrorCode.NOT_FOUND, message);

export const conflict = (message: string) =>
  new ApiError(409, ErrorCode.CONFLICT, message);

/** 422: the request was well-formed but violates a business rule. */
export const unprocessable = (message: string, details?: unknown[]) =>
  new ApiError(422, ErrorCode.UNPROCESSABLE, message, details);
