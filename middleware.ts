/**
 * Next.js Middleware
 * 
 * Combines authentication, authorization, and security headers
 * Using NextAuth v5 beta with Next.js 16
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Public routes that don't require authentication
const publicRoutes = ["/login", "/register", "/api/auth", "/unauthorized"];

// Routes that require authentication
const protectedRoutes = ["/onboarding", "/dashboard", "/invite"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // Create response
  let response: NextResponse;

  // === AUTHENTICATION LOGIC ===

  // Redirect authenticated users away from auth pages
  if (
    isLoggedIn &&
    (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")
  ) {
    response = NextResponse.redirect(new URL("/onboarding", nextUrl));
  }
  // Redirect unauthenticated users to login
  else if (!isLoggedIn && isProtectedRoute) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    response = NextResponse.redirect(loginUrl);
  }
  // Root redirect
  else if (nextUrl.pathname === "/") {
    if (isLoggedIn) {
      response = NextResponse.redirect(new URL("/onboarding", nextUrl));
    } else {
      // Show landing page for guests
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  // === SECURITY HEADERS ===

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // XSS Protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (production only)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  // === CACHE CONTROL ===

  // For protected routes, prevent stale data
  if (isProtectedRoute) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  // === DEVELOPMENT LOGGING ===

  if (process.env.NODE_ENV === "development") {
    const authStatus = isLoggedIn ? "🔓 Authenticated" : "🔒 Guest";
    console.log(`[${req.method}] ${nextUrl.pathname} - ${authStatus}`);
  }

  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata)
     * - public folder files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

