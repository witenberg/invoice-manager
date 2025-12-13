"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { InvoiceFormData } from "@/modules/invoice/invoice-schema";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

/**
 * Additional Annotations Section
 * Legal flags and special markers for KSeF
 * 
 * Features:
 * - Smart defaults based on invoice data
 * - Contextual visibility (only show relevant flags)
 * - Warnings for important selections
 */
export function AdditionalAnnotationsSection() {
  const form = useFormContext<InvoiceFormData>();
  
  // Watch for conditions that require specific flags
  const items = form.watch("items");
  const splitPayment = form.watch("splitPayment");
  const reverseCharge = form.watch("reverseCharge");
  
  const [suggestMpp, setSuggestMpp] = useState(false);

  // Auto-suggest MPP for high-value invoices with sensitive goods
  useEffect(() => {
    if (!items || items.length === 0) return;

    // Calculate total
    let total = 0;
    for (const item of items) {
      if ("quantity" in item && "netPrice" in item) {
        const quantity = parseFloat(item.quantity);
        const netPrice = parseFloat(item.netPrice);
        const vatRate = parseFloat(item.vatRate || "0");
        const netValue = quantity * netPrice;
        const vatValue = (netValue * vatRate) / 100;
        total += netValue + vatValue;
      }
    }

    // Suggest MPP if total > 15,000 PLN
    if (total > 15000) {
      setSuggestMpp(true);
    } else {
      setSuggestMpp(false);
    }
  }, [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Oznaczenia dodatkowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Split Payment (MPP) */}
        <FormField
          control={form.control}
          name="splitPayment"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-1 h-4 w-4"
                />
              </FormControl>
              <div className="flex-1 space-y-1">
                <FormLabel>Mechanizm Podzielonej Płatności (MPP)</FormLabel>
                <FormDescription>
                  Zastosowanie split payment dla towarów wrażliwych
                </FormDescription>
                {suggestMpp && !field.value && (
                  <Alert variant="default" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Wartość faktury przekracza 15,000 PLN. Rozważ włączenie MPP.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reverse Charge */}
        <FormField
          control={form.control}
          name="reverseCharge"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-1 h-4 w-4"
                />
              </FormControl>
              <div className="flex-1 space-y-1">
                <FormLabel>Odwrotne obciążenie</FormLabel>
                <FormDescription>
                  VAT rozlicza nabywca (reverse charge)
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cash Method */}
        <FormField
          control={form.control}
          name="cashMethod"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-1 h-4 w-4"
                />
              </FormControl>
              <div className="flex-1 space-y-1">
                <FormLabel>Metoda kasowa</FormLabel>
                <FormDescription>
                  VAT rozliczany w momencie otrzymania zapłaty
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Self-Billing */}
        <FormField
          control={form.control}
          name="selfBilling"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-1 h-4 w-4"
                />
              </FormControl>
              <div className="flex-1 space-y-1">
                <FormLabel>Samofakturowanie</FormLabel>
                <FormDescription>
                  Faktura wystawiona przez nabywcę w imieniu sprzedawcy
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* KSeF Submission */}
        <FormField
          control={form.control}
          name="sendToKsef"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-1 h-4 w-4"
                />
              </FormControl>
              <div className="flex-1 space-y-1">
                <FormLabel>Wyślij do KSeF</FormLabel>
                <FormDescription>
                  Faktura zostanie automatycznie wysłana do Krajowego Systemu e-Faktur
                </FormDescription>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Uwagi (opcjonalnie)</FormLabel>
              <FormControl>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Dodatkowe informacje..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

