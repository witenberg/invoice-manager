"use client";

import { useFormContext } from "react-hook-form";
import type { InvoiceFormData, InvoiceTotals } from "@/modules/invoice/invoice-schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface InvoiceSummarySidebarProps {
  totals: InvoiceTotals;
}

/**
 * Invoice Summary Sidebar
 * Sticky sidebar showing real-time invoice totals
 * 
 * Features:
 * - VAT breakdown by rate
 * - Total Net, VAT, Gross
 * - Sticky positioning (follows scroll)
 * - Currency display
 */
export function InvoiceSummarySidebar({ totals }: InvoiceSummarySidebarProps) {
  const form = useFormContext<InvoiceFormData>();
  const currency = form.watch("currency") || "PLN";

  return (
    <div className="sticky top-0 max-h-[calc(90vh-8rem)] overflow-y-auto space-y-4">
      {/* Totals Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Podsumowanie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Netto:</span>
            <span className="font-semibold">
              {totals.totalNet} {currency}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT:</span>
            <span className="font-semibold">
              {totals.totalVat} {currency}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Brutto:</span>
            <span className="text-primary">
              {totals.totalGross} {currency}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* VAT Breakdown */}
      {totals.vatBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tabela VAT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {totals.vatBreakdown.map((vat, index) => (
              <div key={index} className="space-y-1 rounded-md bg-muted/50 p-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">
                    Stawka: {getVatRateLabel(vat.vatRate)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Netto</div>
                    <div className="font-semibold">
                      {vat.netValue} {currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">VAT</div>
                    <div className="font-semibold">
                      {vat.vatValue} {currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Brutto</div>
                    <div className="font-semibold">
                      {vat.grossValue} {currency}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getVatRateLabel(vatRate: string): string {
  switch (vatRate) {
    case "zw":
      return "Zwolniona";
    case "np":
      return "Nie podlega";
    case "oo":
      return "Odwrotne obciążenie";
    default:
      return `${vatRate}%`;
  }
}

