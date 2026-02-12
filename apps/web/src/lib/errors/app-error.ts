export type AppErrorCode =
  | "AuthError"
  | "E2EEError"
  | "ValidationError"
  | "NetworkError"
  | "RateLimitError"
  | "IntegrationError"
  | "UnknownError";

export interface AppErrorOptions {
  code: AppErrorCode;
  message: string;
  userMessage: string;
  retryable: boolean;
  blocking: boolean;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly blocking: boolean;
  readonly context?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.retryable = options.retryable;
    this.blocking = options.blocking;
    this.context = options.context;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function isNetworkLikeError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("timeout") ||
    normalized.includes("offline")
  );
}

function isRateLimitLikeError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("rate limit") || normalized.includes("too many requests");
}

export function normalizeAppError(
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again.",
  context?: Record<string, unknown>,
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

  if (isRateLimitLikeError(message)) {
    return new AppError({
      code: "RateLimitError",
      message,
      userMessage: "Too many requests right now. Please retry shortly.",
      retryable: true,
      blocking: false,
      cause: error,
      context,
    });
  }

  if (isNetworkLikeError(message)) {
    return new AppError({
      code: "NetworkError",
      message,
      userMessage: "Network issue detected. Check your connection and retry.",
      retryable: true,
      blocking: false,
      cause: error,
      context,
    });
  }

  return new AppError({
    code: "UnknownError",
    message,
    userMessage: fallbackMessage,
    retryable: true,
    blocking: false,
    cause: error,
    context,
  });
}

export interface ErrorTelemetryPayload {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
  blocking: boolean;
  context?: Record<string, unknown>;
}

export function toErrorTelemetry(error: AppError): ErrorTelemetryPayload {
  return {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    blocking: error.blocking,
    context: error.context,
  };
}

