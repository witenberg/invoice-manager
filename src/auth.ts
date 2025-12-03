import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { companyMembers } from "./db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";
import { env } from "./env";
import type { ExtendedJWT, ExtendedSession } from "./types/auth-types";

/**
 * NextAuth configuration with custom session and JWT handling
 * Extends session with user ID and company memberships
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  secret: env.APP_SECRET_KEY,
  trustHost: true, // Trust the host (needed for localhost in development)
  session: {
    strategy: "jwt", // Credentials provider requires JWT sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  ...authConfig,
  callbacks: {
    /**
     * JWT callback - adds user ID to token on sign in
     */
    async jwt({ token, user }) {
      // Store user ID on initial sign in
      if (user?.id) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.name = user.name ?? null;
      }

      return token;
    },

    /**
     * Session callback - adds company memberships to session
     * Fetches fresh data on each session access for security
     */
    async session({ session, token }) {
      if (!session.user || !token.id) {
        return session;
      }

      try {
        // Fetch user's company memberships
        const memberships = await db
          .select({
            companyId: companyMembers.companyId,
            role: companyMembers.role,
          })
          .from(companyMembers)
          .where(eq(companyMembers.userId, token.id as string));

        return {
          ...session,
          user: {
            ...session.user,
            id: token.id as string,
            companies: memberships,
          },
        };
      } catch (error) {
        // Log error but return session without companies (graceful degradation)
        console.error("Failed to fetch company memberships:", error);

        return {
          ...session,
          user: {
            ...session.user,
            id: token.id as string,
            companies: [],
          },
        };
      }
    },
  },
});