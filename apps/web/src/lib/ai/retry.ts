/**
 * Retry and Fallback Utilities
 * Resilient error handling for AI operations
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;

  /**
   * Base delay in milliseconds (will be multiplied by exponential backoff)
   */
  baseDelayMs: number;

  /**
   * Maximum delay between retries in milliseconds
   */
  maxDelayMs?: number;

  /**
   * Whether to use exponential backoff (default: true)
   */
  exponentialBackoff?: boolean;

  /**
   * Jitter factor (0-1) to add randomness to delays (default: 0.1)
   */
  jitter?: number;

  /**
   * Function to determine if an error is retryable
   */
  isRetryable?: (error: unknown) => boolean;

  /**
   * Callback called before each retry attempt
   */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /**
   * The result if successful
   */
  result: T;

  /**
   * Number of attempts made (1 = succeeded on first try)
   */
  attempts: number;

  /**
   * Total time spent including delays
   */
  totalTimeMs: number;
}

/**
 * Default function to determine if an error is retryable
 */
function defaultIsRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return true;
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return true;
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('econnreset') ||
      message.includes('econnrefused')
    ) {
      return true;
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }

    // Overloaded
    if (message.includes('overloaded') || message.includes('capacity')) {
      return true;
    }
  }

  // Check for HTTP status codes in error objects
  const errorObj = error as { status?: number; statusCode?: number };
  if (errorObj.status !== undefined) {
    return errorObj.status >= 500 || errorObj.status === 429;
  }
  if (errorObj.statusCode !== undefined) {
    return errorObj.statusCode >= 500 || errorObj.statusCode === 429;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  exponentialBackoff: boolean,
  jitter: number
): number {
  let delay = baseDelayMs;

  if (exponentialBackoff) {
    delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
  }

  // Add jitter
  if (jitter > 0) {
    const jitterAmount = delay * jitter * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitterAmount);
  }

  return Math.round(delay);
}

/**
 * Execute a function with retry logic
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => generateStructuredOutput({ ... }),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * );
 * console.log(`Succeeded after ${result.attempts} attempts`);
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<RetryResult<T>> {
  const {
    maxRetries,
    baseDelayMs,
    maxDelayMs = 30000,
    exponentialBackoff = true,
    jitter = 0.1,
    isRetryable = defaultIsRetryable,
    onRetry,
  } = config;

  const startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      return {
        result,
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or error isn't retryable
      if (attempt > maxRetries || !isRetryable(error)) {
        throw error;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs, exponentialBackoff, jitter);

      // Call onRetry callback if provided
      onRetry?.(error, attempt, delay);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Configuration for fallback behavior
 */
export interface FallbackConfig {
  /**
   * Whether to try all models or stop at first success
   */
  stopOnSuccess?: boolean;

  /**
   * Callback called when a model fails
   */
  onModelFail?: (modelId: string, error: unknown) => void;

  /**
   * Callback called when a model succeeds
   */
  onModelSuccess?: (modelId: string) => void;
}

/**
 * Result of a fallback operation
 */
export interface FallbackResult<T> {
  /**
   * The result if successful
   */
  result: T;

  /**
   * The model ID that succeeded
   */
  modelId: string;

  /**
   * Models that were tried (in order)
   */
  triedModels: string[];

  /**
   * Errors from failed models
   */
  errors: Array<{ modelId: string; error: unknown }>;
}

/**
 * Execute a function with fallback to alternative models
 *
 * Tries each model in sequence until one succeeds.
 * Useful for:
 * - Handling model-specific rate limits
 * - Graceful degradation when primary model is unavailable
 * - Cost optimization (try cheaper models first)
 *
 * @example
 * ```ts
 * const { result, modelId } = await withFallback(
 *   ['cred1:gpt-4', 'cred2:claude-3', 'cred3:gemini-pro'],
 *   (modelId) => generateStructuredOutput({ modelId, ... })
 * );
 * console.log(`Succeeded with model: ${modelId}`);
 * ```
 */
export async function withFallback<T>(
  modelIds: string[],
  fn: (modelId: string) => Promise<T>,
  config: FallbackConfig = {}
): Promise<FallbackResult<T>> {
  const { stopOnSuccess = true, onModelFail, onModelSuccess } = config;

  if (modelIds.length === 0) {
    throw new Error('No model IDs provided for fallback');
  }

  const triedModels: string[] = [];
  const errors: Array<{ modelId: string; error: unknown }> = [];

  for (const modelId of modelIds) {
    triedModels.push(modelId);

    try {
      const result = await fn(modelId);
      onModelSuccess?.(modelId);

      if (stopOnSuccess) {
        return {
          result,
          modelId,
          triedModels,
          errors,
        };
      }
    } catch (error) {
      errors.push({ modelId, error });
      onModelFail?.(modelId, error);
    }
  }

  // All models failed
  const errorMessages = errors.map((e) => `${e.modelId}: ${e.error instanceof Error ? e.error.message : String(e.error)}`).join('; ');

  throw new Error(`All models failed: ${errorMessages}`);
}

/**
 * Combine retry and fallback logic
 *
 * First retries the current model, then falls back to alternatives.
 *
 * @example
 * ```ts
 * const { result, modelId } = await withRetryAndFallback(
 *   ['cred1:gpt-4', 'cred2:claude-3'],
 *   (modelId) => generateStructuredOutput({ modelId, ... }),
 *   { maxRetries: 2, baseDelayMs: 1000 }
 * );
 * ```
 */
export async function withRetryAndFallback<T>(
  modelIds: string[],
  fn: (modelId: string) => Promise<T>,
  retryConfig: RetryConfig,
  fallbackConfig: FallbackConfig = {}
): Promise<FallbackResult<T> & { totalAttempts: number }> {
  let totalAttempts = 0;

  const fallbackResult = await withFallback(
    modelIds,
    async (modelId) => {
      const retryResult = await withRetry(() => fn(modelId), retryConfig);
      totalAttempts += retryResult.attempts;
      return retryResult.result;
    },
    fallbackConfig
  );

  return {
    ...fallbackResult,
    totalAttempts,
  };
}

/**
 * Create a retry-wrapped version of a function
 *
 * @example
 * ```ts
 * const retryableGenerate = createRetryable(
 *   generateStructuredOutput,
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * );
 *
 * const result = await retryableGenerate({ ... });
 * ```
 */
export function createRetryable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RetryConfig
): (...args: TArgs) => Promise<RetryResult<TResult>> {
  return (...args: TArgs) => withRetry(() => fn(...args), config);
}
