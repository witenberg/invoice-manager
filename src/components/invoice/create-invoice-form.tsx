"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  invoiceFormSchema,
  calculateInvoiceTotals,
  getDefaultInvoiceValues,
  type InvoiceFormData,
} from "@/modules/invoice/invoice-schema";
import { createInvoiceAction } from "@/app/actions/invoice-actions";
import { fetchContractorsAction } from "@/app/actions/contractor-actions";
import type { Contractor, Company } from "@/types/database-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { InvoiceTypeSelector } from "./invoice-type-selector";
import { SellerSection } from "./sections/seller-section";
import { InvoiceMetadataSection } from "./sections/invoice-metadata-section";
import { BuyerSection } from "./sections/buyer-section";
import { InvoiceItemsSection } from "./sections/invoice-items-section";
import { AdditionalAnnotationsSection } from "./sections/additional-annotations-section";
import { InvoiceSummarySidebar } from "./sections/invoice-summary-sidebar";

interface CreateInvoiceFormProps {
  companyId: number;
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create Invoice Form (Refactored)
 * 
 * Architecture:
 * - Master form with discriminated union for invoice types
 * - Atomic component sections (SOLID, DRY)
 * - Conditional rendering based on invoice type
 * - Real-time validation and calculations
 * - Sticky summary sidebar
 * 
 * Flow:
 * 1. User selects invoice type (VAT / CORRECTION / ADVANCE)
 * 2. Form loads with type-specific defaults
 * 3. User fills form with conditional sections
 * 4. Real-time totals calculation
 * 5. Submit to Server Action
 */
export function CreateInvoiceForm({
  companyId,
  company,
  open,
  onOpenChange,
}: CreateInvoiceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"VAT" | "CORRECTION" | "ADVANCE" | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loadingContractors, setLoadingContractors] = useState(false);

  // Initialize form
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: getDefaultInvoiceValues("VAT") as InvoiceFormData,
  });

  // Watch items for totals calculation
  const watchedItems = form.watch("items");
  const totals = calculateInvoiceTotals(
    watchedItems.filter((item) => "quantity" in item && "netPrice" in item)
  );

  // Fetch contractors when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingContractors(true);
      fetchContractorsAction(companyId)
        .then((data) => setContractors(data))
        .catch((err) => console.error("Error loading contractors:", err))
        .finally(() => setLoadingContractors(false));
    }
  }, [open, companyId]);

  // Show type selector on first open
  useEffect(() => {
    if (open && !invoiceType) {
      setShowTypeSelector(true);
    }
  }, [open, invoiceType]);

  // Handle type selection
  const handleSelectType = (type: "VAT" | "CORRECTION" | "ADVANCE") => {
    setInvoiceType(type);
    form.reset(getDefaultInvoiceValues(type) as InvoiceFormData);
    setShowTypeSelector(false);
  };

  // Form submission handler
  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      try {
        // Convert to FormData - pass as JSON string to avoid double parsing
        const formData = new FormData();
        formData.append("invoiceData", JSON.stringify(data));
        
        const result = await createInvoiceAction(companyId, null, formData);
        
        if (result?.success) {
          toast.success(result.message);
          form.reset();
          setInvoiceType(null);
          onOpenChange(false);
        } else if (result?.success === false) {
          toast.error(result.message);
          
          // Map server errors to form fields
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]) => {
              form.setError(field as any, {
                type: "server",
                message: messages.join(", "),
              });
            });
          }
        }
      } catch (error) {
        console.error("Submit error:", error);
        toast.error("Wystąpił błąd podczas tworzenia faktury");
      }
    });
  });

  // Handle dialog close
  const handleClose = (open: boolean) => {
    if (!open && !isPending) {
      setInvoiceType(null);
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <>
      {/* Type Selector Modal */}
      <InvoiceTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelectType={handleSelectType}
      />

      {/* Main Form Dialog */}
      <Dialog open={open && !showTypeSelector} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-hidden lg:max-w-7xl">
          <DialogHeader>
            <DialogTitle>
              Nowa faktura {invoiceType && `- ${getInvoiceTypeLabel(invoiceType)}`}
            </DialogTitle>
            <DialogDescription>
              Wypełnij formularz, aby utworzyć i wysłać fakturę do KSeF
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-6 max-h-[calc(90vh-8rem)] overflow-hidden">
            {/* Left: Form Sections (Scrollable) */}
            <div className="flex-1 space-y-6 overflow-y-auto pr-4 max-h-full">
              <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-6">
                  {/* Section 0: Seller (Read-only) */}
                  <SellerSection company={company} />

                  {/* Section A: Invoice Metadata */}
                  <InvoiceMetadataSection />

                  {/* Section B: Buyer (+ Recipient) */}
                  <BuyerSection
                    contractors={contractors}
                    loadingContractors={loadingContractors}
                  />

                  {/* Section C: Invoice Items */}
                  <InvoiceItemsSection />

                  {/* Section D: Additional Annotations */}
                  <AdditionalAnnotationsSection />

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-3 border-t pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleClose(false)}
                      disabled={isPending}
                    >
                      Anuluj
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowTypeSelector(true)}
                      disabled={isPending}
                    >
                      Zmień typ faktury
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isPending ? "Tworzenie..." : "Utwórz fakturę"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* Right: Sticky Summary Sidebar */}
            <div className="hidden w-80 self-start lg:block">
              <Form {...form}>
                <InvoiceSummarySidebar totals={totals} />
              </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =========================================================
// HELPER FUNCTIONS
// =========================================================

function getInvoiceTypeLabel(type: "VAT" | "CORRECTION" | "ADVANCE"): string {
  switch (type) {
    case "VAT":
      return "Faktura VAT";
    case "CORRECTION":
      return "Faktura Korygująca";
    case "ADVANCE":
      return "Faktura Zaliczkowa";
  }
}

