"use server";

import { CompanyService } from "@/modules/company/company-service";
import { requireAuth } from "@/lib/route-guards";
import type { Company } from "@/types/database-types";

/**
 * Fetches all companies that the current user has access to
 * 
 * @returns Array of companies (empty if user has no companies)
 */
export async function fetchUserCompaniesAction(): Promise<Company[]> {
  const session = await requireAuth();
  
  const companyService = new CompanyService();
  const companies = await companyService.findUserCompanies(session.user.id);
  
  return companies;
}

