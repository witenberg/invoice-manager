import { db } from '@/db';
import { companyInvitations, companies, companyMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { SafeError } from '@/types/error-types';

/**
 * Invitation data returned from database queries
 */
export type InvitationWithCompany = {
  id: string;
  role: "ACCOUNTANT" | "EMPLOYEE" | "OWNER";
  status: "PENDING" | "ACCEPTED";
  token: string;
  companyName: string;
};

/**
 * Service handling company invitation business logic
 */
export class InvitationService {
  
  /**
   * Fetches invitation by token with company name
   * @returns null if invitation doesn't exist or is expired
   */
  async getInvitationByToken(token: string): Promise<InvitationWithCompany | null> {
    const [result] = await db
      .select({
        id: companyInvitations.id,
        role: companyInvitations.role,
        status: companyInvitations.status,
        token: companyInvitations.token,
        companyName: companies.name,
        expiresAt: companyInvitations.expiresAt,
      })
      .from(companyInvitations)
      .innerJoin(companies, eq(companyInvitations.companyId, companies.id))
      .where(eq(companyInvitations.token, token))
      .limit(1);

    if (!result) return null;

    // Check expiration date
    if (new Date() > result.expiresAt) return null;

    return {
      ...result,
      role: result.role as InvitationWithCompany['role'],
      status: result.status as InvitationWithCompany['status']
    };
  }

  /**
   * Fetches pending invitations for given email
   */
  async getPendingInvitationsByEmail(email: string): Promise<InvitationWithCompany[]> {
    const results = await db
      .select({
        id: companyInvitations.id,
        role: companyInvitations.role,
        status: companyInvitations.status,
        token: companyInvitations.token,
        companyName: companies.name,
      })
      .from(companyInvitations)
      .innerJoin(companies, eq(companyInvitations.companyId, companies.id))
      .where(
        and(
          eq(companyInvitations.email, email),
          eq(companyInvitations.status, 'PENDING')
        )
      );

    return results.map(r => ({
        ...r,
        role: r.role as InvitationWithCompany['role'],
        status: r.status as InvitationWithCompany['status']
    }));
  }

  /**
   * Accepts invitation and adds user to company
   * 
   * Note: Uses transaction for data consistency
   * This works because invitation-service is used on non-serverless endpoints
   */
  async acceptInvitation(token: string, userId: string): Promise<number> {
    return await db.transaction(async (tx) => {
      // Fetch invitation
      const [invite] = await tx
        .select()
        .from(companyInvitations)
        .where(
            and(
                eq(companyInvitations.token, token),
                eq(companyInvitations.status, 'PENDING')
            )
        )
        .limit(1);

      if (!invite) {
        throw new SafeError("Zaproszenie nie istnieje lub zostało już wykorzystane.");
      }

      // Add user to company
      await tx.insert(companyMembers).values({
        userId,
        companyId: invite.companyId,
        role: invite.role as 'OWNER' | 'ACCOUNTANT' | 'EMPLOYEE',
      });

      // Mark invitation as accepted
      await tx.update(companyInvitations)
        .set({ status: 'ACCEPTED' })
        .where(eq(companyInvitations.id, invite.id));

      return invite.companyId;
    });
  }
}