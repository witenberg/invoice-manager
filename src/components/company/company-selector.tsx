"use client";

import { Building2, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompanyWithRole } from "@/contexts/company-context";

interface CompanySelectorProps {
  companies: CompanyWithRole[];
  selectedCompanyId: number | null;
  onCompanyChange: (companyId: number) => void;
  isLoading?: boolean;
}

/**
 * Company Selector Component
 * Dropdown for selecting active company
 * 
 * Separated UI component - logic is in useSelectedCompany hook
 */
export function CompanySelector({
  companies,
  selectedCompanyId,
  onCompanyChange,
  isLoading = false,
}: CompanySelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted animate-pulse">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Ładowanie...</span>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Brak firm</span>
      </div>
    );
  }

  return (
    <Select
      value={selectedCompanyId?.toString() || ""}
      onValueChange={(value) => onCompanyChange(parseInt(value, 10))}
    >
      <SelectTrigger className="w-[250px]">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <SelectValue placeholder="Wybierz firmę" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id.toString()}>
            <span className="font-medium">{company.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              (NIP: {company.nip})
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

