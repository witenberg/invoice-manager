import { db } from "@/db";
import { companies, invoices, invoiceItems, ksefCredentials, contractors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { KsefSessionManager } from "../ksef/services/session-manager";
import { KsefClient } from "../ksef/client";
import { KsefCrypto } from "../ksef/crypto";
import { generateKsefXml } from "../ksef/xml-generator";
import type { FormCode } from "../ksef/types";
import { decrypt } from "@/lib/encryption";
import type {
  InvoiceFormData,
  InvoiceTotals,
  VatInvoiceFormData,
  CorrectionInvoiceFormData,
  AdvanceInvoiceFormData,
} from "./invoice-schema";
import { calculateInvoiceTotals } from "./invoice-schema";
import { parseInvoiceToKsef } from "./invoice-to-ksef-parser";

/**
 * Safe Error class for user-facing error messages
 */
export class InvoiceServiceError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string
  ) {
    super(message);
    this.name = "InvoiceServiceError";
  }
}

/**
 * Invoice Service
 * Handles invoice creation, KSeF submission, and database operations
 */
export class InvoiceService {
  /**
   * Creates and submits invoice to KSeF
   * 
   * Complete workflow:
   * 1. Validate company access
   * 2. Calculate totals
   * 3. Generate FA(3) XML
   * 4. Authenticate with KSeF
   * 5. Encrypt invoice
   * 6. Open session
   * 7. Submit invoice
   * 8. Close session
   * 9. Save to database
   * 
   * @param userId - User creating the invoice
   * @param companyId - Company issuing the invoice
   * @param formData - Invoice form data
   * @returns Created invoice with KSeF reference numbers
   */
  async createAndSubmitInvoice(
    userId: string,
    companyId: number,
    formData: InvoiceFormData
  ): Promise<{
    success: boolean;
    ksefReferenceNumber?: string;
    message: string;
  }> {
    // Step 1: Validate company access and get data
    const company = await this.getCompanyWithCredentials(userId, companyId);

    if (!company.credentials?.authorizationToken) {
      throw new InvoiceServiceError(
        "No KSeF credentials found",
        "Brak skonfigurowanych danych KSeF. Skonfiguruj połączenie w ustawieniach firmy."
      );
    }

    // Decrypt authorization token (stored encrypted in DB)
    let rawAuthToken: string;
    try {
      rawAuthToken = decrypt(company.credentials.authorizationToken);
    } catch (error) {
      throw new InvoiceServiceError(
        "Failed to decrypt KSeF token",
        "Nie udało się odszyfrować tokena KSeF. Skonfiguruj ponownie token w ustawieniach."
      );
    }

    // Step 2: Calculate totals
    const totals = calculateInvoiceTotals(formData);

    // Step 3: Find contractor by NIP (if provided)
    const contractorId = await this.findContractorByNip(companyId, formData.buyer.nip);

    // Step 4: Save invoice to database (DRAFT or PROCESSING status)
    const invoiceId = await this.saveInvoiceToDatabase(
      companyId,
      contractorId,
      formData,
      totals,
      {
        ksefStatus: formData.sendToKsef ? "PROCESSING" : "DRAFT",
      }
    );

    // If user doesn't want to send to KSeF, return success (draft saved)
    if (!formData.sendToKsef) {
      return {
        success: true,
        message: "Faktura została zapisana jako szkic.",
      };
    }

    // Step 5: Parse form data to KSeF structure
    const ksefInput = parseInvoiceToKsef(formData, {
      company: {
        name: company.name,
        nip: company.nip,
        addressData: company.addressData,
      },
    });

    // Step 6: Generate XML
    const invoiceXml = generateKsefXml(ksefInput);

    // Step 7-11: Submit to KSeF
    let ksefResult;
    try {
      ksefResult = await this.submitToKsef(
        invoiceXml,
        companyId,
        invoiceId // Pass invoice ID to update status
      );
      
      // Update invoice with KSeF reference numbers
      await this.updateInvoiceKsefData(invoiceId, {
        ksefReferenceNumber: ksefResult.invoiceReferenceNumber,
        ksefSessionId: ksefResult.sessionReferenceNumber,
      });
    } catch (error) {
      // KSeF submission failed - update status to REJECTED
      console.error("KSeF submission error:", error);
      
      await this.updateInvoiceStatus(invoiceId, "REJECTED", {
        ksefErrors: [error instanceof Error ? error.message : "Unknown error"],
      });
      
      throw new InvoiceServiceError(
        `KSeF submission failed: ${error instanceof Error ? error.message : "Unknown"}`,
        "Nie udało się wysłać faktury do KSeF. Faktura została zapisana ze statusem 'Odrzucona'."
      );
    }

    return {
      success: true,
      ksefReferenceNumber: ksefResult.invoiceReferenceNumber,
      message: "Faktura została wysłana do KSeF pomyślnie. Oczekiwanie na potwierdzenie.",
    };
  }

  /**
   * Submits invoice to KSeF following the complete workflow
   * Uses KsefSessionManager to ensure valid session token
   * Automatically retries once with refreshed token if authorization fails
   */
  private async submitToKsef(
    invoiceXml: string,
    companyId: number,
    invoiceId: number
  ): Promise<{
    sessionReferenceNumber: string;
    invoiceReferenceNumber: string;
  }> {
    const sessionManager = new KsefSessionManager();
    
    try {
      return await this.executeKsefSubmission(sessionManager, invoiceXml, companyId, invoiceId);
    } catch (error) {
      // Check if it's an authorization error (401/403)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const is401Error = errorMessage.includes("401") || errorMessage.includes("Unauthorized");
      const is403Error = errorMessage.includes("403") || errorMessage.includes("Forbidden");
      
      if (is401Error || is403Error) {
        console.log("[KSeF] Authorization error detected, forcing token refresh and retrying...");
        
        try {
          // Force refresh the token
          await sessionManager.forceRefreshToken(companyId);
          
          // Retry the submission with new token
          return await this.executeKsefSubmission(sessionManager, invoiceXml, companyId, invoiceId);
        } catch (retryError) {
          console.error("[KSeF] Retry after token refresh failed:", retryError);
          throw retryError;
        }
      }
      
      // Not an auth error, just rethrow
      throw error;
    }
  }

  /**
   * Executes the actual KSeF submission workflow
   * Separated to allow retry logic
   */
  private async executeKsefSubmission(
    sessionManager: KsefSessionManager,
    invoiceXml: string,
    companyId: number,
    invoiceId: number
  ): Promise<{
    sessionReferenceNumber: string;
    invoiceReferenceNumber: string;
  }> {
    const client = new KsefClient();
    const crypto = new KsefCrypto();

    // Step 1: Get valid session token (automatically refreshes if expired)
    const sessionToken = await sessionManager.getValidSessionToken(companyId);

    // Step 2: Encrypt invoice
    const encryptionResult = await crypto.encryptInvoice(invoiceXml);

    // Step 3: Calculate hashes
    const hashes = crypto.calculateInvoiceHashes(
      invoiceXml,
      encryptionResult.encryptedData
    );

    // Step 4: Open session
    const formCode: FormCode = {
      systemCode: "FA (3)",
      schemaVersion: "1-0E",
      value: "FA",
    };
    const sessionResult = await client.openOnlineSession(sessionToken, {
      formCode,
      encryption: {
        encryptedSymmetricKey: encryptionResult.encryptedSymmetricKey,
        initializationVector: encryptionResult.initializationVector,
      },
    });

    // Step 5: Submit invoice
    const submitResult = await client.submitInvoice(
      sessionToken,
      sessionResult.referenceNumber,
      {
        invoiceHash: hashes.originalHash,
        invoiceSize: hashes.originalSize,
        encryptedInvoiceHash: hashes.encryptedHash,
        encryptedInvoiceSize: hashes.encryptedSize,
        encryptedInvoiceContent: encryptionResult.encryptedData,
        offlineMode: false,
      }
    );
    console.log("[KSeF] Invoice submitted:", {
      invoiceReferenceNumber: submitResult.referenceNumber,
      sessionReferenceNumber: sessionResult.referenceNumber,
    });

    // Step 6: Wait a bit for KSeF to start processing (usually instant, but give it a moment)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 7: Check invoice status
    let invoiceStatus: Awaited<ReturnType<typeof client.getInvoiceStatus>> | null = null;
    try {
      invoiceStatus = await client.getInvoiceStatus(
        sessionToken,
        sessionResult.referenceNumber,
        submitResult.referenceNumber
      );
      console.log("[KSeF] Invoice status:", JSON.stringify(invoiceStatus, null, 2));
      
      // Update invoice status based on KSeF response
      if (invoiceStatus.status.code === 200) {
        // Success - update to VALID with KSeF number from status response
        // KSeF number is available directly in the status response
        await this.updateInvoiceStatus(invoiceId, "VALID", {
          ksefNumber: invoiceStatus.ksefNumber,
        });
      } else {
        // Error - update to REJECTED
        await this.updateInvoiceStatus(invoiceId, "REJECTED", {
          ksefErrors: invoiceStatus.status.details || [invoiceStatus.status.description],
          // For duplicate invoices, original KSeF number might be in extensions
          ksefNumber: invoiceStatus.status.extensions?.originalKsefNumber || undefined,
        });
      }
      
    } catch (error) {
      console.warn("[KSeF] Failed to get invoice status:", error);
      // Don't fail the whole flow if status check fails
    }

    // Step 8: Get UPO if invoice was successfully processed
    // UPO is optional - we already have ksefNumber from status response
    // But we can fetch UPO for archival purposes
    if (invoiceStatus && invoiceStatus.status.code === 200) {
      try {
        // Wait a bit more for UPO to be generated
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const upoXml = await client.getInvoiceUpo(
          sessionToken,
          sessionResult.referenceNumber,
          submitResult.referenceNumber
        );
        console.log("[KSeF] UPO received (length):", upoXml.length, "characters");
        console.log("[KSeF] UPO XML (first 500 chars):", upoXml.substring(0, 500));
        
        // Save UPO XML for archival purposes
        // KSeF number is already saved from status response above
        await this.updateInvoiceStatus(invoiceId, "VALID", {
          ksefUpoRaw: upoXml,
        });
        
      } catch (error) {
        console.warn("[KSeF] Failed to get UPO (may not be ready yet):", error);
        // UPO fetch failure is not critical - we already have ksefNumber from status
        // Invoice is already marked as VALID above
      }
    } else if (invoiceStatus) {
      // Invoice processing failed - already updated above
      console.error("[KSeF] Invoice processing failed:", {
        code: invoiceStatus.status.code,
        description: invoiceStatus.status.description,
        details: invoiceStatus.status.details,
        extensions: invoiceStatus.status.extensions,
      });
    }

    // Step 9: Close session (best effort - don't fail if it doesn't work)
    try {
      await client.closeOnlineSession(
        sessionToken,
        sessionResult.referenceNumber
      );
      console.log("[KSeF] Session closed successfully");
    } catch (error) {
      // Session close can fail if invoices are still processing
      // Error 21180 (status 415) means session cannot be closed yet
      // This is not critical - KSeF will auto-close after processing completes
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isProcessingError = errorMessage.includes("21180") || errorMessage.includes("415");
      
      if (isProcessingError) {
        console.log(
          "[KSeF] Session close skipped - invoices still processing (expected behavior). KSeF will auto-close session."
        );
      } else {
        console.warn(
          "[KSeF] Session close failed with unexpected error:",
          error instanceof Error ? error.message : error
        );
      }
    }

    return {
      sessionReferenceNumber: sessionResult.referenceNumber,
      invoiceReferenceNumber: submitResult.referenceNumber,
    };
  }

  /**
   * Finds contractor by NIP for the given company
   * Returns null if not found
   */
  private async findContractorByNip(
    companyId: number,
    nip: string | undefined
  ): Promise<number | null> {
    if (!nip || nip.trim() === "") {
      return null;
    }

    const result = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(and(eq(contractors.companyId, companyId), eq(contractors.nip, nip)))
      .limit(1);

    return result.length > 0 ? result[0].id : null;
  }


  /**
   * Saves invoice to database with all fields
   */
  private async saveInvoiceToDatabase(
    companyId: number,
    contractorId: number | null,
    formData: InvoiceFormData,
    totals: InvoiceTotals,
    options: {
      ksefStatus: "DRAFT" | "PROCESSING";
    }
  ): Promise<number> {
    // Prepare buyer address snapshot
    const buyerAddress = {
      street: formData.buyer.address.street,
      buildingNumber: formData.buyer.address.buildingNumber,
      flatNumber: formData.buyer.address.flatNumber || undefined,
      city: formData.buyer.address.city,
      postalCode: formData.buyer.address.postalCode,
      countryCode: formData.buyer.address.countryCode,
    };

    // Prepare recipient data if exists
    const recipientAddress = formData.hasRecipient && formData.recipient
      ? {
          street: formData.recipient.address.street,
          buildingNumber: formData.recipient.address.buildingNumber,
          flatNumber: formData.recipient.address.flatNumber || undefined,
          city: formData.recipient.address.city,
          postalCode: formData.recipient.address.postalCode,
          countryCode: formData.recipient.address.countryCode,
        }
      : undefined;

    // Prepare base invoice data
    const invoiceData: any = {
      companyId,
      contractorId,
      buyerNameSnapshot: formData.buyer.name,
      buyerNipSnapshot: formData.buyer.nip || null,
      buyerAddressSnapshot: buyerAddress,
      hasRecipient: formData.hasRecipient,
      recipientNameSnapshot: formData.hasRecipient && formData.recipient
        ? formData.recipient.name
        : null,
      recipientNipSnapshot: formData.hasRecipient && formData.recipient
        ? formData.recipient.nip || null
        : null,
      recipientAddressSnapshot: recipientAddress || null,
      number: formData.number,
      type: formData.type,
      issueDate: new Date(formData.issueDate),
      saleDate: new Date(formData.saleDate),
      paymentDeadline: formData.paymentDeadline
        ? new Date(formData.paymentDeadline)
        : null,
      paymentMethod: formData.paymentMethod,
      bankAccount: formData.bankAccount || null,
      splitPayment: formData.splitPayment,
      reverseCharge: formData.reverseCharge,
      cashMethod: formData.cashMethod,
      selfBilling: formData.selfBilling,
      currency: formData.currency,
      exchangeRate: formData.exchangeRate || "1.0000",
      totalNet: totals.totalNet,
      totalVat: totals.totalVat,
      totalGross: totals.totalGross,
      ksefStatus: options.ksefStatus,
      sendToKsef: formData.sendToKsef,
      notes: formData.notes || null,
    };

    // Add type-specific fields
    if (formData.type === "CORRECTION") {
      const correctionData = formData as CorrectionInvoiceFormData;
      invoiceData.originalInvoiceNumber = correctionData.originalInvoice.number;
      invoiceData.originalInvoiceIssueDate = new Date(
        correctionData.originalInvoice.issueDate
      );
      invoiceData.originalInvoiceKsefNumber =
        correctionData.originalInvoice.ksefNumber || null;
      invoiceData.correctionReason = correctionData.correctionReason;
    } else if (formData.type === "ADVANCE") {
      const advanceData = formData as AdvanceInvoiceFormData;
      invoiceData.orderValue = advanceData.orderDetails.orderValue;
      invoiceData.orderDate = new Date(advanceData.orderDetails.orderDate);
      invoiceData.orderNumber = advanceData.orderDetails.orderNumber || null;
      invoiceData.advancePercentage = advanceData.advancePercentage;
    }

    // Insert invoice
    const [insertedInvoice] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning({ id: invoices.id });

    const invoiceId = insertedInvoice.id;

    // Save invoice items
    await this.saveInvoiceItems(invoiceId, formData, totals);

    return invoiceId;
  }

  /**
   * Saves invoice items to database
   */
  private async saveInvoiceItems(
    invoiceId: number,
    formData: InvoiceFormData,
    totals: InvoiceTotals
  ): Promise<void> {
    if (formData.type === "VAT" || formData.type === "ADVANCE") {
      const items = formData.items as any[];
      const itemsToInsert = items.map((item) => {
        const quantity = parseFloat(item.quantity);
        const netPrice = parseFloat(item.netPrice);
        const netValue = quantity * netPrice;
        let vatValue = 0;
        if (
          item.vatRate !== "zw" &&
          item.vatRate !== "np" &&
          item.vatRate !== "oo"
        ) {
          const vatRateNum = parseFloat(item.vatRate);
          vatValue = (netValue * vatRateNum) / 100;
        }
        const grossValue = netValue + vatValue;

        return {
          invoiceId,
          name: item.name,
          quantity: quantity.toString(),
          unit: item.unit,
          netPrice: netPrice.toString(),
          vatRate: item.vatRate,
          netValue: netValue.toFixed(2),
          vatValue: vatValue.toFixed(2),
          grossValue: grossValue.toFixed(2),
          gtuCode: item.gtuCode || null,
          pkwiu: item.pkwiu || null,
          cn: item.cn || null,
        };
      });

      await db.insert(invoiceItems).values(itemsToInsert);
    } else if (formData.type === "CORRECTION") {
      const items = formData.items as any[];
      const itemsToInsert = items.map((item) => {
        // Calculate "after" values
        const quantityAfter = parseFloat(item.quantityAfter);
        const netPriceAfter = parseFloat(item.netPriceAfter);
        const netValue = quantityAfter * netPriceAfter;
        let vatValue = 0;
        if (
          item.vatRateAfter !== "zw" &&
          item.vatRateAfter !== "np" &&
          item.vatRateAfter !== "oo"
        ) {
          const vatRateNum = parseFloat(item.vatRateAfter);
          vatValue = (netValue * vatRateNum) / 100;
        }
        const grossValue = netValue + vatValue;

        // Calculate "before" values for reference
        const quantityBefore = parseFloat(item.quantityBefore);
        const netPriceBefore = parseFloat(item.netPriceBefore);

        return {
          invoiceId,
          name: item.name,
          quantity: quantityAfter.toString(), // Use "after" as primary
          unit: item.unit,
          netPrice: netPriceAfter.toString(),
          vatRate: item.vatRateAfter,
          netValue: netValue.toFixed(2),
          vatValue: vatValue.toFixed(2),
          grossValue: grossValue.toFixed(2),
          gtuCode: item.gtuCode || null,
          // Correction-specific fields
          quantityBefore: quantityBefore.toString(),
          netPriceBefore: netPriceBefore.toString(),
          vatRateBefore: item.vatRateBefore,
          quantityAfter: quantityAfter.toString(),
          netPriceAfter: netPriceAfter.toString(),
          vatRateAfter: item.vatRateAfter,
        };
      });

      await db.insert(invoiceItems).values(itemsToInsert);
    }
  }

  /**
   * Updates invoice KSeF data (reference numbers, session ID)
   */
  private async updateInvoiceKsefData(
    invoiceId: number,
    data: {
      ksefReferenceNumber?: string;
      ksefSessionId?: string;
    }
  ): Promise<void> {
    await db
      .update(invoices)
      .set(data)
      .where(eq(invoices.id, invoiceId));
  }

  /**
   * Updates invoice status and related KSeF data
   */
  private async updateInvoiceStatus(
    invoiceId: number,
    status: "DRAFT" | "PROCESSING" | "VALID" | "REJECTED",
    additionalData?: {
      ksefNumber?: string;
      ksefUpoRaw?: string;
      ksefErrors?: string[];
    }
  ): Promise<void> {
    const updateData: any = {
      ksefStatus: status,
    };

    if (additionalData) {
      if (additionalData.ksefNumber) {
        updateData.ksefNumber = additionalData.ksefNumber;
      }
      if (additionalData.ksefUpoRaw) {
        updateData.ksefUpoRaw = additionalData.ksefUpoRaw;
      }
      if (additionalData.ksefErrors) {
        updateData.ksefErrors = additionalData.ksefErrors;
      }
    }

    await db.update(invoices).set(updateData).where(eq(invoices.id, invoiceId));
  }

  /**
   * Gets company data with KSeF credentials
   * Validates user access
   */
  private async getCompanyWithCredentials(
    userId: string,
    companyId: number
  ): Promise<{
    id: number;
    name: string;
    nip: string;
    addressData: {
      street: string;
      buildingNumber: string;
      city: string;
      postalCode: string;
      countryCode: string;
    };
    createdAt: Date | null;
    credentials: {
      authorizationToken: string;
      environment: string;
    } | null;
  }> {
    const result = await db
      .select({
        company: companies,
        credentials: ksefCredentials,
      })
      .from(companies)
      .leftJoin(
        ksefCredentials,
        eq(companies.id, ksefCredentials.companyId)
      )
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!result.length) {
      throw new InvoiceServiceError(
        "Company not found",
        "Firma nie została znaleziona."
      );
    }

    const { company, credentials } = result[0];

    // TODO: Verify user has access via company_members table
    // For now, we assume access is valid

    return {
      id: company.id,
      name: company.name,
      nip: company.nip,
      addressData: company.addressData,
      createdAt: company.createdAt,
      credentials: credentials
        ? {
            authorizationToken: credentials.authorizationToken || "",
            environment: credentials.environment,
          }
        : null,
    };
  }
}

