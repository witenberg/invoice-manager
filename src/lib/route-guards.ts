/**
 * Route Guards and Protection Utilities
 * Helper functions for protecting routes and checking permissions
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { CompanyRole } from "@/types";

/**
 * Ensures user is authenticated
 * Redirects to login if not authenticated
 * 
 * @param redirectTo - Optional URL to redirect after login
 * @returns Authenticated session
 */
export async function requireAuth(redirectTo?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    const callbackUrl = redirectTo
      ? `?callbackUrl=${encodeURIComponent(redirectTo)}`
      : "";
    redirect(`/login${callbackUrl}`);
  }

  return session;
}

/**
 * Ensures user is NOT authenticated
 * Redirects to dashboard if already logged in
 * 
 * @param redirectTo - URL to redirect to if authenticated
 */
export async function requireGuest(redirectTo = "/onboarding") {
  const session = await auth();

  if (session?.user?.id) {
    redirect(redirectTo);
  }
}

/**
 * Checks if user has access to specific company
 * 
 * @param companyId - Company ID to check
 * @param allowedRoles - Optional array of allowed roles
 * @returns True if user has access
 */
export async function hasCompanyAccess(
  companyId: number,
  allowedRoles?: CompanyRole[]
): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.companies) {
    return false;
  }

  const membership = session.user.companies.find(
    (c) => c.companyId === companyId
  );

  if (!membership) {
    return false;
  }

  if (allowedRoles && !allowedRoles.includes(membership.role as CompanyRole)) {
    return false;
  }

  return true;
}

/**
 * Ensures user has access to specific company
 * Redirects to unauthorized page if no access
 * 
 * @param companyId - Company ID to check
 * @param allowedRoles - Optional array of allowed roles
 */
export async function requireCompanyAccess(
  companyId: number,
  allowedRoles?: CompanyRole[]
): Promise<void> {
  const hasAccess = await hasCompanyAccess(companyId, allowedRoles);

  if (!hasAccess) {
    redirect("/unauthorized");
  }
}



