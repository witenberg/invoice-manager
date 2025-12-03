/**
 * Error handling utilities
 * Sanitizes errors before exposing to users
 */

/**
 * Known error types that can be safely shown to users
 * Use this for user-facing errors that don't expose sensitive information
 */
export class SafeError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "SafeError";
    // Maintains proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SafeError);
    }
  }
}

/**
 * Default error message for unexpected errors (Polish)
 * Customize per application requirements or use i18n
 */
const DEFAULT_ERROR_MESSAGE = "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";

/**
 * Sanitizes error messages for user display
 * Prevents exposing internal errors/stack traces to end users
 * 
 * @param error - Any error object or unknown value
 * @param fallbackMessage - Optional custom fallback message
 * @returns User-safe error message
 */
export function getSafeErrorMessage(
  error: unknown,
  fallbackMessage: string = DEFAULT_ERROR_MESSAGE
): string {
  // Known safe errors can be shown directly
  if (error instanceof SafeError) {
    return error.message;
  }

  // Log full error server-side for debugging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.error("[getSafeErrorMessage] Error occurred:", error);
  } else {
    // In production, log without stack trace to reduce noise
    console.error("[getSafeErrorMessage] Error type:", error instanceof Error ? error.name : typeof error);
  }

  // For all other errors, return generic message
  return fallbackMessage;
}

/**
 * Type guard to check if error is a known safe error
 */
export function isSafeError(error: unknown): error is SafeError {
  return error instanceof SafeError;
}

/**
 * Wraps a function to catch and convert errors to SafeError
 * Useful for service layer methods
 */
export async function catchToSafeError<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  errorCode?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SafeError) {
      throw error;
    }
    throw new SafeError(errorMessage, errorCode);
  }
}


