import { auth } from "@/auth";
import { InvitationService } from "../../../modules/company/invitation-service";
import { InviteView } from "./InviteView";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Invitation acceptance page
 * Displays invitation details and allows user to accept
 * 
 * @returns 404 if invitation is invalid, expired, or already accepted
 */
export default async function InvitePage({ params }: PageProps) {
  // Await params (Next.js 15+ requirement)
  const { token } = await params;

  // Validate token format (basic check)
  if (!token || token.trim().length === 0) {
    notFound();
  }

  const session = await auth();

  // Fetch invitation data
  const service = new InvitationService();
  const invitation = await service.getInvitationByToken(token.trim());

  // Handle edge cases
  if (!invitation) {
    // Invitation doesn't exist or is expired
    notFound();
  }

  if (invitation.status !== "PENDING") {
    // Invitation already accepted
    notFound();
  }

  // Render invitation view
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <InviteView
        invitation={invitation}
        isAuthenticated={!!session?.user}
        userName={session?.user?.name}
      />
    </div>
  );
}