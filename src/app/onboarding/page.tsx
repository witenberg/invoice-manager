import { requireAuth } from "@/lib/route-guards";
import { redirect } from "next/navigation";
import { InvitationService } from "@/modules/company/invitation-service";
import { CompanyService } from "@/modules/company/company-service";
import { InvitationsList } from "./InvitationsList";
import { CreateCompanyForm } from "./CreateCompanyForm";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Onboarding Page
 * Allows users to create their first company or accept invitations
 */
export default async function OnboardingPage() {
  // Ensure user is authenticated
  const session = await requireAuth();

  // Guard: Redirect to dashboard if user already has a company
  if (session.user.id) {
    const companyService = new CompanyService();
    const userCompanies = await companyService.findUserCompanies(
      session.user.id
    );

    if (userCompanies.length > 0) {
      redirect("/dashboard");
    }
  }

  // Fetch pending invitations for user's email
  const service = new InvitationService();
  const invitations = await service.getPendingInvitationsByEmail(
    session.user.email || ""
  );

  return (
    <div className="container max-w-2xl py-10 space-y-8">
      <PageHeader
        title="Witaj w systemie"
        description="Aby rozpocząć, dołącz do istniejącej firmy lub utwórz nową."
      />

      {invitations.length > 0 && (
        <>
          <InvitationsList invitations={invitations} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Lub utwórz nową
              </span>
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Rejestracja nowej firmy
          </h3>
          <CreateCompanyForm />
        </div>
      </div>
    </div>
  );
}