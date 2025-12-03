/**
 * Authentication Type Definitions
 * Centralized types for NextAuth and authentication flows
 */

import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { companyMembers } from "@/db/schema";

/**
 * Company membership data included in session
 */
export interface UserCompanyMembership {
  companyId: number;
  role: typeof companyMembers.$inferSelect.role;
}

/**
 * Extended JWT token with user ID
 */
export interface ExtendedJWT extends JWT {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Extended session user with company memberships
 */
export interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  companies: UserCompanyMembership[];
}

/**
 * Extended session with custom user type
 */
export interface ExtendedSession {
  user: ExtendedUser;
  expires: string;
}

/**
 * Type guard to check if session has extended user
 */
export function isExtendedSession(
  session: DefaultSession | ExtendedSession | null
): session is ExtendedSession {
  return (
    session !== null &&
    session.user !== undefined &&
    "id" in session.user &&
    typeof session.user.id === "string" &&
    "companies" in session.user
  );
}

