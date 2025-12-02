/**
 * Error handling utilities
 * Sanitizes errors before exposing to users
 */

/**
 * Known error types that can be safely shown to users
 */
export class SafeError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'SafeError'
  }
}

/**
 * Sanitizes error messages for user display
 * Prevents exposing internal errors/stack traces
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof SafeError) {
    return error.message
  }
  
  if (error instanceof Error) {
    // Log full error server-side
    console.error('Error occurred:', error)
    
    // Return generic message to user
    return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
  }
  
  return 'Wystąpił nieoczekiwany błąd.'
}

/**
 * Checks if error is a known safe error
 */
export function isSafeError(error: unknown): error is SafeError {
  return error instanceof SafeError
}

