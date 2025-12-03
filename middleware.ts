/**
 * Next.js Middleware
 * 
 * Handles authentication and authorization at the edge
 * Using NextAuth v5 beta with Next.js 16
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"

// Public routes that don't require authentication
const publicRoutes = [
    "/login",
    "/register",
    "/api/auth",
]

// Routes that require authentication
const protectedRoutes = [
    "/onboarding",
    "/dashboard",
    "/invite",
]

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth

    const isPublicRoute = publicRoutes.some(route => 
        nextUrl.pathname.startsWith(route)
    )
    
    const isProtectedRoute = protectedRoutes.some(route => 
        nextUrl.pathname.startsWith(route)
    )

    // Redirect authenticated users away from auth pages
    if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
        return NextResponse.redirect(new URL("/onboarding", nextUrl))
    }

    // Redirect unauthenticated users to login
    if (!isLoggedIn && isProtectedRoute) {
        const callbackUrl = nextUrl.pathname + nextUrl.search
        const loginUrl = new URL("/login", nextUrl)
        loginUrl.searchParams.set("callbackUrl", callbackUrl)
        return NextResponse.redirect(loginUrl)
    }

    // Root redirect
    if (nextUrl.pathname === "/") {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/onboarding", nextUrl))
        }
        return NextResponse.redirect(new URL("/login", nextUrl))
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         * - public folder
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
