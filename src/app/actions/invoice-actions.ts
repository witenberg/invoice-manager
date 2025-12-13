"use server";

import { z } from "zod";
import { InvoiceFormData, invoiceFormSchema } from "@/modules/invoice/invoice-schema";
import { InvoiceService, InvoiceServiceError } from "@/modules/invoice/invoice-service";
import { requireAuth } from "@/lib/route-guards";
import { revalidatePath } from "next/cache";

/**
 * Server Action State for Invoice Creation
 * Used with useActionState hook
 */
export type InvoiceActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  ksefReferenceNumber?: string;
} | null;

/**
 * Creates and submits invoice to KSeF
 * 
 * Server Action for invoice form submission.
 * Validates data, creates invoice, submits to KSeF, and saves to database.
 * 
 * @param companyId - ID of the company issuing the invoice
 * @param prevState - Previous action state (from useActionState)
 * @param formData - Form data from client
 * @returns Action state with success/error information
 */
export async function createInvoiceAction(
  companyId: number,
  prevState: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  try {
    // Require authentication
    const session = await requireAuth();

    // Parse JSON data from FormData
    const invoiceDataJson = formData.get("invoiceData");
    if (!invoiceDataJson || typeof invoiceDataJson !== "string") {
      return {
        success: false,
        message: "Brak danych faktury. Spróbuj ponownie.",
      };
    }

    const rawData = JSON.parse(invoiceDataJson) as InvoiceFormData;
    console.log("rawData", rawData);

    // Validate with Zod schema
    const validationResult = invoiceFormSchema.safeParse(rawData);
    console.log("validationResult", validationResult.error?.flatten().fieldErrors);

    if (!validationResult.success) {
      return {
        success: false,
        message: "Formularz zawiera błędy. Sprawdź wprowadzone dane.",
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // Create and submit invoice
    const invoiceService = new InvoiceService();
    const result = await invoiceService.createAndSubmitInvoice(
      session.user.id,
      companyId,
      validationResult.data
    );

    // Revalidate company page to show new invoice
    revalidatePath(`/dashboard/companies/${companyId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: result.message,
      ksefReferenceNumber: result.ksefReferenceNumber,
    };
  } catch (error) {
    console.error("Invoice creation error:", error);

    // Handle known service errors
    if (error instanceof InvoiceServiceError) {
      return {
        success: false,
        message: error.userMessage,
      };
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Błąd walidacji danych.",
        errors: error.flatten().fieldErrors,
      };
    }

    // Handle database unique constraint violations
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("duplicate key value") || errorMessage.includes("unique constraint")) {
      // Extract invoice number from error if possible
      const match = errorMessage.match(/number\)=\([^,]+,\s*([^)]+)\)/);
      const invoiceNumber = match ? match[1] : "";
      
      return {
        success: false,
        message: invoiceNumber 
          ? `Faktura o numerze "${invoiceNumber}" już istnieje. Użyj innego numeru.`
          : "Faktura o tym numerze już istnieje. Użyj innego numeru.",
        errors: {
          number: ["Numer faktury musi być unikalny dla tej firmy."],
        },
      };
    }

    // Generic error
    return {
      success: false,
      message:
        "Wystąpił nieoczekiwany błąd podczas tworzenia faktury. Spróbuj ponownie.",
    };
  }
}


