
import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "./db"
import { companyMembers } from "./db/schema"
import { eq } from "drizzle-orm"
import { authConfig } from "./auth.config"
import { env } from "./env"

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
        async jwt({ token, user }) {
            // Store user ID on initial sign in
            if (user) {
                token.id = user.id as string
                token.email = user.email
                token.name = user.name
            }
            
            return token
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string
                
                // Fetch user's company memberships
                const memberships = await db
                    .select({
                        companyId: companyMembers.companyId,
                        role: companyMembers.role,
                    })
                    .from(companyMembers)
                    .where(eq(companyMembers.userId, token.id as string))

                session.user.companies = memberships;
            }
            
            return session
        },
    },
})