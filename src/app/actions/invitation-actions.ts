'use server'

import { auth } from "@/auth";
import { InvitationService } from "@/modules/company/invitation-service";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { InvitationActionState } from "@/types/action-types";
import { getSafeErrorMessage } from "@/types/error-types";

/**
 * Accepts a company invitation
 * @param token - Invitation token from URL
 */
export async function acceptInvitationAction(token: string): Promise<InvitationActionState> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { error: "Musisz być zalogowany, aby zaakceptować zaproszenie." };
    }

    // Execute business logic
    const service = new InvitationService();
    const newCompanyId = await service.acceptInvitation(token, session.user.id);

    // Redirect on success
    redirect(`/dashboard/companies/${newCompanyId}`);
    
  } catch (error) {
    // Allow redirects to pass through
    if (isRedirectError(error)) {
      throw error;
    }

    // Return safe error message
    return { error: getSafeErrorMessage(error) };
  }
}