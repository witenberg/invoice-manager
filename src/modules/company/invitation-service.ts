import { db } from "@/db";
import { companyInvitations, companies, companyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SafeError } from "@/types/error-types";
import type { CompanyRole } from "@/types/ksef-types";

/**
 * Invitation status enum
 */
export type InvitationStatus = "PENDING" | "ACCEPTED";

/**
 * Invitation data returned from database queries
 */
export interface InvitationWithCompany {
  id: string;
  role: CompanyRole;
  status: InvitationStatus;
  token: string;
  companyName: string;
}

/**
 * Service handling company invitation business logic
 */
export class InvitationService {
  /**
   * Validates and maps database invitation to InvitationWithCompany type
   * Ensures type safety for role and status fields
   */
  private mapToInvitationWithCompany(
    data: {
      id: string;
      role: string;
      status: string;
      token: string;
      companyName: string;
    }
  ): InvitationWithCompany {
    const validRoles: CompanyRole[] = ["OWNER", "ACCOUNTANT", "EMPLOYEE"];
    const validStatuses: InvitationStatus[] = ["PENDING", "ACCEPTED"];

    if (!validRoles.includes(data.role as CompanyRole)) {
      throw new Error(`Invalid role in invitation: ${data.role}`);
    }

    if (!validStatuses.includes(data.status as InvitationStatus)) {
      throw new Error(`Invalid status in invitation: ${data.status}`);
    }

    return {
      id: data.id,
      role: data.role as CompanyRole,
      status: data.status as InvitationStatus,
      token: data.token,
      companyName: data.companyName,
    };
  }

  /**
   * Fetches invitation by token with company name
   * 
   * @param token - Invitation token from URL
   * @returns Invitation data or null if not found/expired
   */
  async getInvitationByToken(
    token: string
  ): Promise<InvitationWithCompany | null> {
    if (!token || token.trim().length === 0) {
      return null;
    }

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
      .where(eq(companyInvitations.token, token.trim()))
      .limit(1);

    if (!result) {
      return null;
    }

    // Check expiration date
    if (new Date() > result.expiresAt) {
      return null;
    }

    return this.mapToInvitationWithCompany(result);
  }

  /**
   * Fetches pending invitations for given email
   * 
   * @param email - User email to search for
   * @returns Array of pending invitations (empty if none found)
   */
  async getPendingInvitationsByEmail(
    email: string
  ): Promise<InvitationWithCompany[]> {
    if (!email || email.trim().length === 0) {
      return [];
    }

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
          eq(companyInvitations.email, email.trim().toLowerCase()),
          eq(companyInvitations.status, "PENDING")
        )
      );

    return results.map((r) => this.mapToInvitationWithCompany(r));
  }

  /**
   * Accepts invitation and adds user to company
   * 
   * Note: Uses transaction for data consistency.
   * This works because invitation-service is used on non-serverless endpoints.
   * 
   * @param token - Invitation token
   * @param userId - User ID accepting the invitation
   * @returns Company ID that user was added to
   * @throws SafeError if invitation is invalid or already used
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
            eq(companyInvitations.status, "PENDING")
          )
        )
        .limit(1);

      if (!invite) {
        throw new SafeError(
          "Zaproszenie nie istnieje lub zostało już wykorzystane."
        );
      }

      // Validate role before inserting
      const validRoles: CompanyRole[] = ["OWNER", "ACCOUNTANT", "EMPLOYEE"];
      if (!validRoles.includes(invite.role as CompanyRole)) {
        throw new Error(`Invalid role in invitation: ${invite.role}`);
      }

      // Check if user is already a member (prevent duplicates)
      const [existingMember] = await tx
        .select()
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.userId, userId),
            eq(companyMembers.companyId, invite.companyId)
          )
        )
        .limit(1);

      if (existingMember) {
        throw new SafeError("Już jesteś członkiem tej firmy.");
      }

      // Add user to company
      await tx.insert(companyMembers).values({
        userId,
        companyId: invite.companyId,
        role: invite.role as CompanyRole,
      });

      // Mark invitation as accepted
      await tx
        .update(companyInvitations)
        .set({ status: "ACCEPTED" })
        .where(eq(companyInvitations.id, invite.id));

      return invite.companyId;
    });
  }
}