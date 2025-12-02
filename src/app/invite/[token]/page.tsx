import { auth } from "@/auth";
import { InvitationService } from "../../../modules/company/invitation-service";
import { InviteView } from "./InviteView";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  // 1. Await params (Next.js 15+)
  const { token } = await params;
  const session = await auth();

  // 2. Fetch Data
  const service = new InvitationService();
  const invitation = await service.getInvitationByToken(token);

  // 3. Handle 404
  if (!invitation || invitation.status !== 'PENDING') {
    return notFound(); 
    // Lub return <InvalidInviteCard />
  }

  // 4. Render View
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