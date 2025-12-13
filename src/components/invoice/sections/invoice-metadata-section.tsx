"use client";

import { useFormContext } from "react-hook-form";
import type { InvoiceFormData } from "@/modules/invoice/invoice-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Invoice Metadata Section
 * Displays invoice number, dates, payment method, and currency
 * 
 * Conditional fields based on invoice type:
 * - CORRECTION: Shows original invoice data
 * - ADVANCE: Shows order details
 */
export function InvoiceMetadataSection() {
  const form = useFormContext<InvoiceFormData>();
  const invoiceType = form.watch("type");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dane faktury</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numer faktury *</FormLabel>
              <FormControl>
                <Input placeholder="FV/001/2025" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="issueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data wystawienia *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saleDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data sprzedaży *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentDeadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Termin płatności</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma płatności *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="transfer">Przelew</SelectItem>
                  <SelectItem value="cash">Gotówka</SelectItem>
                  <SelectItem value="card">Karta</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Waluta *</FormLabel>
              <FormControl>
                <Input placeholder="PLN" {...field} maxLength={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditional: Original Invoice Data (Correction Only) */}
        {invoiceType === "CORRECTION" && (
          <>
            <FormField
              control={form.control}
              name="originalInvoice.number"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Numer faktury korygowanej *</FormLabel>
                  <FormControl>
                    <Input placeholder="FV/001/2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="originalInvoice.issueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data faktury korygowanej *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="originalInvoice.ksefNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numer KSeF (jeśli dostępny)</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890-12345678-ABCDEF..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="correctionReason"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Przyczyna korekty *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Błędna cena / ilość / stawka VAT..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Conditional: Order Details (Advance Only) */}
        {invoiceType === "ADVANCE" && (
          <>
            <FormField
              control={form.control}
              name="orderDetails.orderValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wartość zamówienia *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="1000.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderDetails.orderDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data zamówienia *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderDetails.orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numer zamówienia</FormLabel>
                  <FormControl>
                    <Input placeholder="ZAM/001/2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="advancePercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procent zaliczki *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      max="100" 
                      placeholder="100" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

