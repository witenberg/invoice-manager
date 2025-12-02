/**
 * Common types for server actions
 * Defines standardized response shapes for form actions
 */

export type ActionState<T = Record<string, unknown>> = {
  success: boolean
  message?: string
  errors?: Record<string, string[]>
  data?: T
}

export type OnboardingActionState = ActionState

export type InvitationActionState = {
  error?: string
}

