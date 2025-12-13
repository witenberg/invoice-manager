"use client";

import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { InvoiceFormData } from "@/modules/invoice/invoice-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Invoice Items Section
 * Dynamic array of invoice line items
 * 
 * Features:
 * - Add/remove items dynamically
 * - Toggle advanced fields (GTU, PKWiU, CN)
 * - Different rendering for CORRECTION invoices (before/after)
 * - Real-time calculation of line totals
 */
export function InvoiceItemsSection() {
  const form = useFormContext<InvoiceFormData>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const invoiceType = form.watch("type");
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleAddItem = () => {
    if (invoiceType === "CORRECTION") {
      append({
        name: "",
        quantityBefore: "1",
        netPriceBefore: "0",
        vatRateBefore: "23",
        quantityAfter: "1",
        netPriceAfter: "0",
        vatRateAfter: "23",
        unit: "szt",
        gtuCode: "",
      });
    } else {
      append({
        name: "",
        quantity: "1",
        unit: "szt",
        netPrice: "0",
        vatRate: "23",
        gtuCode: "",
        pkwiu: "",
        cn: "",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pozycje faktury</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Ukryj zaawansowane
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Pokaż zaawansowane
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render different item layouts based on invoice type */}
        {invoiceType === "CORRECTION" ? (
          <CorrectionItemsList
            fields={fields}
            remove={remove}
            showAdvanced={showAdvanced}
          />
        ) : (
          <StandardItemsList
            fields={fields}
            remove={remove}
            showAdvanced={showAdvanced}
          />
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
        >
          <Plus className="mr-2 h-4 w-4" />
          Dodaj pozycję
        </Button>
      </CardContent>
    </Card>
  );
}

// Standard Items (VAT, ADVANCE)
function StandardItemsList({
  fields,
  remove,
  showAdvanced,
}: {
  fields: any[];
  remove: (index: number) => void;
  showAdvanced: boolean;
}) {
  const form = useFormContext<InvoiceFormData>();

  return (
    <>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid gap-4 rounded-lg border p-4 md:grid-cols-6"
        >
          <FormField
            control={form.control}
            name={`items.${index}.name`}
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>Nazwa *</FormLabel>
                <FormControl>
                  <Input placeholder="Usługa / Towar" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ilość *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.unit`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>J.m. *</FormLabel>
                <FormControl>
                  <Input placeholder="szt" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.netPrice`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cena netto *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.vatRate`}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>VAT *</FormLabel>
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
                    <SelectItem value="23">23%</SelectItem>
                    <SelectItem value="8">8%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="zw">zw (zwolniona)</SelectItem>
                    <SelectItem value="np">np (nie podlega)</SelectItem>
                    <SelectItem value="oo">oo (odwrotne obciążenie)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Advanced Fields */}
          {showAdvanced && (
            <>
              <FormField
                control={form.control}
                name={`items.${index}.gtuCode`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>GTU</FormLabel>
                    <FormControl>
                      <Input placeholder="GTU_01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.pkwiu`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>PKWiU</FormLabel>
                    <FormControl>
                      <Input placeholder="62.01.11.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.cn`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>CN</FormLabel>
                    <FormControl>
                      <Input placeholder="8471 30 00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Remove Button */}
          {fields.length > 1 && (
            <div className="flex items-end md:col-span-6">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(index)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </Button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// Correction Items (Before/After comparison)
function CorrectionItemsList({
  fields,
  remove,
  showAdvanced,
}: {
  fields: any[];
  remove: (index: number) => void;
  showAdvanced: boolean;
}) {
  const form = useFormContext<InvoiceFormData>();

  return (
    <>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-lg border p-4 space-y-4"
        >
          <FormField
            control={form.control}
            name={`items.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwa *</FormLabel>
                <FormControl>
                  <Input placeholder="Usługa / Towar" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {/* BEFORE */}
            <div className="space-y-3 rounded-md bg-muted/50 p-3">
              <h4 className="text-sm font-medium">Stan przed korektą</h4>
              
              <FormField
                control={form.control}
                name={`items.${index}.quantityBefore`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ilość</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.netPriceBefore`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena netto</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.vatRateBefore`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT</FormLabel>
                    <FormControl>
                      <Input placeholder="23" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* AFTER */}
            <div className="space-y-3 rounded-md bg-primary/5 p-3">
              <h4 className="text-sm font-medium">Stan po korekcie</h4>
              
              <FormField
                control={form.control}
                name={`items.${index}.quantityAfter`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ilość</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.netPriceAfter`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena netto</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.vatRateAfter`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT</FormLabel>
                    <FormControl>
                      <Input placeholder="23" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name={`items.${index}.unit`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jednostka miary *</FormLabel>
                <FormControl>
                  <Input placeholder="szt" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Remove Button */}
          {fields.length > 1 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(index)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń
            </Button>
          )}
        </div>
      ))}
    </>
  );
}

