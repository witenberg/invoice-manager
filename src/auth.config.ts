import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { env } from "./env"
import { AuthService } from "./modules/auth/auth-service"
import { z } from "zod"

// Credentials validation schema
const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

export const authConfig = {
    providers: [
        Google({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                try {
                    // Validate credentials
                    const parsed = credentialsSchema.safeParse(credentials)
                    if (!parsed.success) {
                        return null
                    }

                    // Authenticate user
                    const authService = new AuthService()
                    const user = await authService.authenticate({
                        email: parsed.data.email,
                        password: parsed.data.password,
                    })

                    return user
                } catch (error) {
                    console.error("Auth error:", error)
                    return null
                }
            }
        })
    ],
    pages: {
        signIn: '/login',
        newUser: '/onboarding',
    },
} satisfies NextAuthConfig