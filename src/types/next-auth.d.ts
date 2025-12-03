/**
 * NextAuth type declarations
 * Extends default NextAuth types with custom fields
 */

import type { DefaultSession } from "next-auth";
import type { UserCompanyMembership } from "./auth-types";

declare module "next-auth" {
  /**
   * Extends the built-in session.user type
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      companies: UserCompanyMembership[];
    } & DefaultSession["user"];
  }

  /**
   * Extends the built-in User type
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extends the built-in JWT type
   */
  interface JWT {
    id?: string;
    email?: string;
    name?: string | null;
  }
}



