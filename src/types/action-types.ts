/**
 * Common types for server actions
 * Defines standardized response shapes for form actions
 */

/**
 * Generic action state for server actions with form validation
 * @template TData - Optional data payload type (use never if no data returned)
 */
export type ActionState<TData = never> = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
} & ([TData] extends [never] ? {} : { data: TData });

/**
 * Action state for onboarding flow (company creation)
 */
export type OnboardingActionState = ActionState<never>;

/**
 * Action state for invitation acceptance
 * Returns error message on failure, redirects on success
 */
export type InvitationActionState = {
  error?: string;
};

/**
 * Type guard to check if action state represents success
 */
export function isActionSuccess<TData = never>(
  state: ActionState<TData> | null
): state is ActionState<TData> & { success: true } {
  return state !== null && state.success === true;
}

/**
 * Type guard to check if action state has validation errors
 */
export function hasValidationErrors<TData = never>(
  state: ActionState<TData> | null
): state is ActionState<TData> & { errors: Record<string, string[]> } {
  return state !== null && state.errors !== undefined;
}


