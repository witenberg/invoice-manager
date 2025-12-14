"use client";

import { CompanySelector } from "./company-selector";
import { useCompany } from "@/contexts/company-context";

/**
 * Company Selector Wrapper
 * Uses CompanyContext to get companies and selection state
 * 
 * This component is a thin wrapper that connects the UI component
 * with the company context
 */
export function CompanySelectorWrapper() {
  const {
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    isLoading,
  } = useCompany();

  return (
    <CompanySelector
      companies={companies}
      selectedCompanyId={selectedCompanyId}
      onCompanyChange={setSelectedCompanyId}
      isLoading={isLoading}
    />
  );
}

