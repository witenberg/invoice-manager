"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Users } from "lucide-react";
import type { InvoiceFormData } from "@/modules/invoice/invoice-schema";
import type { Contractor } from "@/types/database-types";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BuyerSectionProps {
  contractors: Contractor[];
  loadingContractors: boolean;
}

/**
 * Buyer Section
 * Allows selecting contractor from list or entering manually
 * 
 * Features:
 * - Contractor dropdown with search
 * - Manual entry option
 * - Optional recipient (different delivery address)
 */
export function BuyerSection({
  contractors,
  loadingContractors,
}: BuyerSectionProps) {
  const form = useFormContext<InvoiceFormData>();
  const [selectedContractorId, setSelectedContractorId] = useState<string>("");
  
  const hasRecipient = form.watch("hasRecipient");

  const handleContractorSelect = (contractorId: string) => {
    setSelectedContractorId(contractorId);

    if (contractorId === "manual") {
      // Clear fields for manual entry
      form.setValue("buyer.name", "");
      form.setValue("buyer.nip", "");
      form.setValue("buyer.address.street", "");
      form.setValue("buyer.address.buildingNumber", "");
      form.setValue("buyer.address.flatNumber", "");
      form.setValue("buyer.address.city", "");
      form.setValue("buyer.address.postalCode", "");
      form.setValue("buyer.address.countryCode", "PL");
      return;
    }

    const contractor = contractors.find((c) => c.id.toString() === contractorId);
    if (contractor) {
      form.setValue("buyer.name", contractor.name);
      form.setValue("buyer.nip", contractor.nip || "");
      form.setValue("buyer.address.street", contractor.addressData.street);
      form.setValue("buyer.address.buildingNumber", contractor.addressData.buildingNumber);
      form.setValue("buyer.address.flatNumber", contractor.addressData.flatNumber || "");
      form.setValue("buyer.address.city", contractor.addressData.city);
      form.setValue("buyer.address.postalCode", contractor.addressData.postalCode);
      form.setValue("buyer.address.countryCode", contractor.addressData.countryCode);
    }
  };

  const isFieldDisabled = selectedContractorId !== "" && selectedContractorId !== "manual";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nabywca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contractor Selection */}
          <div className="space-y-2">
            <Label htmlFor="contractor-select">Wybierz kontrahenta</Label>
            <Select
              value={selectedContractorId}
              onValueChange={handleContractorSelect}
              disabled={loadingContractors}
            >
              <SelectTrigger id="contractor-select">
                <SelectValue
                  placeholder={
                    loadingContractors
                      ? "Ładowanie..."
                      : "Wybierz z listy lub wpisz ręcznie"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Wpisz ręcznie</span>
                  </div>
                </SelectItem>
                {contractors.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Kontrahenci
                    </div>
                    {contractors.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id.toString()}>
                        {contractor.name}{" "}
                        {contractor.nip ? `(NIP: ${contractor.nip})` : ""}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Buyer Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="buyer.name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nazwa nabywcy *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nazwa firmy"
                      {...field}
                      disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyer.nip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIP</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567890"
                      maxLength={10}
                      {...field}
                      disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyer.address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ulica *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ul. Przykładowa"
                      {...field}
                      disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyer.address.buildingNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nr budynku *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1"
                      {...field}
                      disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyer.address.flatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nr lokalu</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="-"
                      {...field}
                      disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyer.address.postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod pocztowy *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00-000"
                      {...field}
                      disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyer.address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miasto *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Warszawa"
                      {...field}
                      disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buyer.address.countryCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod kraju *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PL"
                      maxLength={2}
                      {...field}
                      disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Has Recipient Checkbox */}
          <FormField
            control={form.control}
            name="hasRecipient"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 rounded-lg border p-4">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      // Initialize recipient with empty values when checked
                      if (e.target.checked) {
                        const currentRecipient = form.getValues("recipient");
                        if (!currentRecipient) {
                          form.setValue("recipient", {
                            name: "",
                            nip: "",
                            address: {
                              street: "",
                              buildingNumber: "",
                              flatNumber: "",
                              city: "",
                              postalCode: "",
                              countryCode: "PL",
                            },
                          });
                        }
                      } else {
                        // Clear recipient data and errors when unchecked
                        form.setValue("recipient", undefined);
                        // Clear all recipient field errors
                        form.clearErrors("recipient");
                      }
                    }}
                    className="h-4 w-4"
                  />
                </FormControl>
                <div>
                  <FormLabel>Odbiorca jest inny niż nabywca</FormLabel>
                  <FormDescription>
                    Zaznacz, jeśli faktura ma być dostarczona pod inny adres
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Conditional: Recipient Section */}
      {hasRecipient && form.watch("recipient") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Odbiorca</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="recipient.name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nazwa odbiorcy *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nazwa firmy / odbiorcy" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient.nip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIP (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" maxLength={10} {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient.address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ulica *</FormLabel>
                  <FormControl>
                    <Input placeholder="ul. Przykładowa" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient.address.buildingNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nr budynku *</FormLabel>
                  <FormControl>
                    <Input placeholder="1" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient.address.flatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nr lokalu</FormLabel>
                  <FormControl>
                    <Input placeholder="-" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient.address.postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod pocztowy *</FormLabel>
                  <FormControl>
                    <Input placeholder="00-000" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient.address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miasto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Warszawa" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipient.address.countryCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod kraju *</FormLabel>
                  <FormControl>
                    <Input placeholder="PL" maxLength={2} {...field} value={field.value || "PL"} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

