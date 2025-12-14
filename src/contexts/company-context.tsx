"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { fetchUserCompaniesAction } from "@/app/actions/company-actions";
import { useSelectedCompany } from "@/hooks/use-selected-company";
import type { UserCompanyMembership } from "@/types/auth-types";
import type { Company } from "@/types/database-types";

/**
 * Company with user's role in that company
 */
export interface CompanyWithRole extends Company {
  role: UserCompanyMembership["role"];
}

interface CompanyContextValue {
  companies: CompanyWithRole[];
  selectedCompany: CompanyWithRole | null;
  selectedCompanyId: number | null;
  setSelectedCompanyId: (companyId: number | null) => void;
  isLoading: boolean;
  refreshCompanies: () => Promise<void>;
  /**
   * Get user's role in a specific company
   */
  getUserRole: (companyId: number) => UserCompanyMembership["role"] | null;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

/**
 * Company Context Provider
 * Provides company selection state to all child components
 * 
 * Architecture:
 * - Session (auth.ts) is the source of truth for memberships (companyId + role)
 * - Context fetches full company data and merges with roles from session
 * - This ensures consistency: only companies from session are shown
 * - Roles are always up-to-date from session (refreshed on each request)
 * 
 * Usage:
 * ```tsx
 * const { selectedCompany, getUserRole, companies } = useCompany();
 * const role = getUserRole(companyId); // Get user's role in a company
 * ```
 */
export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<CompanyWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedCompanyId, selectedCompany, setSelectedCompanyId } =
    useSelectedCompany(companies);

  /**
   * Load companies and merge with roles from session
   * Session is the source of truth for memberships
   */
  const loadCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get memberships from session (source of truth for access)
      const memberships = session?.user?.companies || [];
      
      if (memberships.length === 0) {
        setCompanies([]);
        return;
      }

      // Fetch full company data
      const companyData = await fetchUserCompaniesAction();
      
      // Create a map of companyId -> role from session
      const roleMap = new Map<number, UserCompanyMembership["role"]>();
      memberships.forEach((membership) => {
        roleMap.set(membership.companyId, membership.role);
      });

      // Merge company data with roles from session
      // Only include companies that user has access to (from session)
      const companiesWithRoles: CompanyWithRole[] = companyData
        .filter((company) => roleMap.has(company.id))
        .map((company) => ({
          ...company,
          role: roleMap.get(company.id)!,
        }));

      setCompanies(companiesWithRoles);
    } catch (error) {
      console.error("Failed to load companies:", error);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.companies]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  /**
   * Get user's role in a specific company
   */
  const getUserRole = useCallback(
    (companyId: number): UserCompanyMembership["role"] | null => {
      const company = companies.find((c) => c.id === companyId);
      return company?.role || null;
    },
    [companies]
  );

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        selectedCompanyId,
        setSelectedCompanyId,
        isLoading,
        refreshCompanies: loadCompanies,
        getUserRole,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

/**
 * Hook to access company context
 * 
 * @throws Error if used outside CompanyProvider
 */
export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}

