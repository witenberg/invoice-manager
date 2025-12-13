import { db } from "@/db";
import { companies, invoices, invoiceItems, ksefCredentials } from "@/db/schema";
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

    // Step 2: Calculate totals (for validation/logging)
    // const totals = calculateInvoiceTotals(
    //   formData.items.filter((item) => "quantity" in item && "netPrice" in item)
    // );

    // If user doesn't want to send to KSeF, return error (we don't save drafts anymore)
    if (!formData.sendToKsef) {
      throw new InvoiceServiceError(
        "Send to KSeF is disabled",
        "Aby utworzyć fakturę, musisz zaznaczyć opcję 'Wyślij do KSeF'."
      );
    }

    // Step 3: Parse form data to KSeF structure
    const ksefInput = parseInvoiceToKsef(formData, {
      company: {
        name: company.name,
        nip: company.nip,
        addressData: company.addressData,
      },
    });

    console.log("ksefInput", ksefInput);

    // Step 4: Generate XML
    const invoiceXml = generateKsefXml(ksefInput);
    console.log("invoiceXml", invoiceXml);

    // Step 5-9: Submit to KSeF
    let ksefResult;
    try {
      ksefResult = await this.submitToKsef(
        company.nip,
        rawAuthToken,
        invoiceXml,
        companyId
      );
    } catch (error) {
      // KSeF submission failed
      console.error("KSeF submission error:", error);
      
      throw new InvoiceServiceError(
        `KSeF submission failed: ${error instanceof Error ? error.message : "Unknown"}`,
        "Nie udało się wysłać faktury do KSeF. Spróbuj ponownie."
      );
    }

    // TODO: Save invoice to database after KSeF accepts it
    // This should be done when we receive UPO (Urzędowe Poświadczenie Odbioru) confirmation
    // Placeholder for future implementation:
    // - Wait for UPO confirmation from KSeF
    // - Parse UPO to get KSeF number
    // - Save invoice with status "VALID" and KSeF number
    // - Save invoice items
    // - Link to contractor if applicable

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
    nip: string,
    authToken: string,
    invoiceXml: string,
    companyId: number
  ): Promise<{
    sessionReferenceNumber: string;
    invoiceReferenceNumber: string;
  }> {
    const sessionManager = new KsefSessionManager();
    
    try {
      return await this.executeKsefSubmission(sessionManager, invoiceXml, companyId);
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
          return await this.executeKsefSubmission(sessionManager, invoiceXml, companyId);
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
    companyId: number
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
      
      // TODO: Save invoice status to database
      // - invoiceStatus.status.code: 200 = success, 4xx = error
      // - invoiceStatus.status.description: Human-readable status
      // - invoiceStatus.status.details: Array of error messages (if any)
      // - invoiceStatus.status.extensions?.originalKsefNumber: KSeF number if duplicate
      
    } catch (error) {
      console.warn("[KSeF] Failed to get invoice status:", error);
      // Don't fail the whole flow if status check fails
    }

    // Step 8: Get UPO if invoice was successfully processed
    let upoXml: string | null = null;
    if (invoiceStatus && invoiceStatus.status.code === 200) {
      try {
        // Wait a bit more for UPO to be generated
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        upoXml = await client.getInvoiceUpo(
          sessionToken,
          sessionResult.referenceNumber,
          submitResult.referenceNumber
        );
        console.log("[KSeF] UPO received (length):", upoXml.length, "characters");
        console.log("[KSeF] UPO XML (first 500 chars):", upoXml.substring(0, 500));
        
        // TODO: Parse UPO XML to extract:
        // - KSeF number (35-char identifier)
        // - Invoice status confirmation
        // - Any additional metadata
        // Then save to database:
        // - ksefStatus: "VALID"
        // - ksefNumber: from UPO
        // - ksefUpoRaw: upoXml (or parsed version)
        // - ksefReferenceNumber: submitResult.referenceNumber
        // - ksefSessionId: sessionResult.referenceNumber
        
      } catch (error) {
        console.warn("[KSeF] Failed to get UPO (may not be ready yet):", error);
        // UPO might not be ready yet - this is not critical
        // In production, you might want to poll for UPO or use a webhook
      }
    } else if (invoiceStatus) {
      // Invoice processing failed
      console.error("[KSeF] Invoice processing failed:", {
        code: invoiceStatus.status.code,
        description: invoiceStatus.status.description,
        details: invoiceStatus.status.details,
        extensions: invoiceStatus.status.extensions,
      });
      
      // TODO: Save failed invoice to database
      // - ksefStatus: "REJECTED"
      // - ksefErrors: invoiceStatus.status.details
      // - ksefReferenceNumber: submitResult.referenceNumber
      // - ksefSessionId: sessionResult.referenceNumber
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
   * TODO: Save invoice to database after KSeF accepts it
   * 
   * This method should be called when:
   * 1. We receive UPO (Urzędowe Poświadczenie Odbioru) confirmation from KSeF
   * 2. UPO contains KSeF number (35-char identifier)
   * 3. Invoice status should be set to "VALID"
   * 
   * Implementation steps:
   * 1. Parse UPO XML to extract KSeF number
   * 2. Save invoice header with:
   *    - ksefStatus: "VALID"
   *    - ksefNumber: from UPO
   *    - ksefReferenceNumber: from submission result
   *    - ksefSessionId: from submission result
   * 3. Save invoice items
   * 4. Link to contractor if applicable (from formData.contractorId if we add it)
   * 
   * Placeholder signature:
   * private async saveInvoiceToDatabase(
   *   companyId: number,
   *   formData: InvoiceFormData,
   *   totals: InvoiceTotals,
   *   ksefData: {
   *     ksefStatus: "VALID" | "REJECTED";
   *     ksefNumber?: string;
   *     ksefReferenceNumber: string;
   *     ksefSessionId: string;
   *     ksefErrors?: string[];
   *   }
   * ): Promise<number>
   */

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

