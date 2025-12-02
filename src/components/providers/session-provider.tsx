'use client'

/**
 * Session Provider Wrapper
 * 
 * Client component wrapper for NextAuth SessionProvider
 * Provides session context to client components
 */

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { type Session } from "next-auth"

interface SessionProviderProps {
    children: React.ReactNode
    session?: Session | null
}

export function SessionProvider({ children, session }: SessionProviderProps) {
    return (
        <NextAuthSessionProvider 
            session={session}
            refetchInterval={0}
            refetchOnWindowFocus={false}
        >
            {children}
        </NextAuthSessionProvider>
    )
}

