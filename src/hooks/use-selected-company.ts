"use client";

import { useState, useEffect, useCallback } from "react";
import type { CompanyWithRole } from "@/contexts/company-context";

const SELECTED_COMPANY_STORAGE_KEY = "selected-company-id";

/**
 * Hook for managing selected company
 * Persists selection in localStorage
 * 
 * @param companies - Array of available companies
 * @returns Selected company and setter function
 */
export function useSelectedCompany(companies: CompanyWithRole[]) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    if (stored) {
      const companyId = parseInt(stored, 10);
      // Verify that the stored company ID is still in the user's companies
      if (!isNaN(companyId) && companies.some((c) => c.id === companyId)) {
        setSelectedCompanyIdState(companyId);
        return;
      }
    }

    // If no valid stored company, select the first one
    if (companies.length > 0) {
      setSelectedCompanyIdState(companies[0].id);
    }
  }, [companies]);

  // Save to localStorage whenever selection changes
  const setSelectedCompanyId = useCallback((companyId: number | null) => {
    setSelectedCompanyIdState(companyId);
    
    if (typeof window !== "undefined") {
      if (companyId !== null) {
        localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, companyId.toString());
      } else {
        localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
      }
    }
  }, []);

  // Get selected company object
  const selectedCompany: CompanyWithRole | null =
    companies.find((c) => c.id === selectedCompanyId) || null;

  return {
    selectedCompanyId,
    selectedCompany,
    setSelectedCompanyId,
  };
}

