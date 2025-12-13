"use client";

import { useFormContext } from "react-hook-form";
import type { InvoiceFormData } from "@/modules/invoice/invoice-schema";
import type { Company } from "@/types/database-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SellerSectionProps {
  company: Company;
}

/**
 * Seller Section (Read-only)
 * Displays company (seller) information from database
 * This data is automatically filled and cannot be edited in the form
 */
export function SellerSection({ company }: SellerSectionProps) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="text-base">Sprzedawca (Twoja firma)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Nazwa</p>
          <p className="text-sm font-semibold">{company.name}</p>
        </div>
        
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">NIP</p>
            <p className="text-sm">{company.nip}</p>
          </div>
          
          <div>
            <p className="text-xs font-medium text-muted-foreground">Adres</p>
            <p className="text-sm">
              {company.addressData.street} {company.addressData.buildingNumber}
              <br />
              {company.addressData.postalCode} {company.addressData.city}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

