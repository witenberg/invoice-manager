import { db } from "@/db";
import { companies, companyMembers, ksefCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt, EncryptionError } from "@/lib/encryption";
import { KsefClient } from "@/modules/ksef/client";
import { SafeError } from "@/types/error-types";
import type { Company, CompanyMember } from "@/types/database-types";
import type { CompanyRole, KsefEnvironment } from "@/types/ksef-types";

/**
 * Input DTO for company creation
 */
export interface CreateCompanyDto {
  userId: string;
  name: string;
  nip: string;
  address: {
    street: string;
    buildingNumber: string;
    city: string;
    postalCode: string;
    countryCode: string;
  };
  ksefToken: string;
}

/**
 * Result of setting KSeF token
 */
export interface SetKsefTokenResult {
  success: boolean;
}

/**
 * Service handling company-related business logic
 */
export class CompanyService {
  /**
   * Default KSeF environment (can be made configurable per company)
   */
  private readonly DEFAULT_KSEF_ENV: KsefEnvironment = "test";

  /**
   * Saves KSeF authorization token (encrypted)
   * Used in company settings when user pastes token generated from Ministry of Finance
   * 
   * @throws SafeError if user lacks permissions
   * @throws EncryptionError if token encryption fails
   */
  async setKsefToken(
    userId: string,
    companyId: number,
    rawToken: string
  ): Promise<SetKsefTokenResult> {
    // Validate input
    if (!rawToken || rawToken.trim().length === 0) {
      throw new SafeError("Token KSeF nie może być pusty");
    }

    // Check permissions
    await this.ensureUserHasAccess(userId, companyId, ["OWNER", "ACCOUNTANT"]);

    // Encrypt token with application key (AES-256)
    const encryptedToken = encrypt(rawToken.trim());

    // Upsert credentials
    await db
      .insert(ksefCredentials)
      .values({
        companyId: companyId,
        environment: this.DEFAULT_KSEF_ENV,
        authorizationToken: encryptedToken,
      })
      .onConflictDoUpdate({
        target: ksefCredentials.companyId,
        set: {
          authorizationToken: encryptedToken,
          // Reset session when changing main token
          sessionToken: null,
          sessionValidUntil: null,
        },
      });

    return { success: true };
  }

  /**
   * Validates KSeF token without creating a company
   * Performs a lightweight check by attempting to login
   * 
   * @param nip - Company NIP
   * @param ksefToken - KSeF authorization token
   * @throws SafeError if token is invalid or KSeF login fails
   */
  async validateKsefToken(nip: string, ksefToken: string): Promise<void> {
    // Basic validation
    if (!nip || nip.length !== 10) {
      throw new SafeError("NIP musi mieć dokładnie 10 znaków.");
    }

    if (!ksefToken || ksefToken.trim().length < 30) {
      throw new SafeError("Token KSeF jest nieprawidłowy.");
    }

    // Initialize KSeF client
    const ksefClient = new KsefClient();

    try {
      // Attempt login to validate token
      // We don't save the session, just validate that credentials work
      await ksefClient.login(nip, ksefToken.trim());
    } catch (error) {
      // Log full error for debugging
      if (process.env.NODE_ENV === "development") {
        console.error("KSeF token validation error:", error);
      }

      // Map known KSeF error codes to user-friendly messages
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes("błędnego tokenu") || errorMsg.includes("21418")) {
          throw new SafeError("Token KSeF jest nieprawidłowy. Sprawdź czy skopiowałeś cały token.");
        }
        
        if (errorMsg.includes("timeout")) {
          throw new SafeError("Przekroczono limit czasu połączenia z KSeF. Spróbuj ponownie.");
        }
      }

      // For other errors, provide generic message
      throw new SafeError(
        "Nie udało się zweryfikować tokena KSeF. Sprawdź poprawność danych i spróbuj ponownie."
      );
    }
  }

  /**
   * Tests KSeF connection for a specific company
   * Logs in to KSeF and saves resulting session token
   * 
   * @throws SafeError if user lacks access, company not found, or KSeF login fails
   */
  async testConnection(
    userId: string,
    companyId: number
  ): Promise<{
    success: boolean;
    message: string;
    validUntil: string;
  }> {
    // Check access
    await this.ensureUserHasAccess(userId, companyId);

    // Fetch company data and credentials
    const result = await db
      .select({
        nip: companies.nip,
        credentials: ksefCredentials,
      })
      .from(companies)
      .leftJoin(ksefCredentials, eq(ksefCredentials.companyId, companies.id))
      .where(eq(companies.id, companyId))
      .limit(1);

    const companyData = result[0];

    if (!companyData) {
      throw new SafeError("Nie znaleziono firmy.");
    }

    if (!companyData.credentials?.authorizationToken) {
      throw new SafeError(
        "Firma nie ma skonfigurowanego tokena autoryzacyjnego KSeF."
      );
    }

    // Decrypt authorization token
    let rawAuthToken: string;
    try {
      rawAuthToken = decrypt(companyData.credentials.authorizationToken);
    } catch (error) {
      // Log error for debugging but don't expose details
      if (process.env.NODE_ENV === "development") {
        console.error("Decryption failed:", error);
      }

      if (error instanceof EncryptionError) {
        throw new SafeError(
          "Nie udało się odszyfrować tokena. Skontaktuj się z administratorem."
        );
      }

      throw new SafeError("Błąd wewnętrzny podczas przetwarzania tokena.");
    }

    // Initialize KSeF client
    const ksefClient = new KsefClient();

    try {
      // Perform full login (Challenge -> Encrypt -> Init -> Redeem)
      const sessionResponse = await ksefClient.login(
        companyData.nip,
        rawAuthToken
      );

      // Success! Save session token in database (cache)
      await db
        .update(ksefCredentials)
        .set({
          sessionToken: sessionResponse.accessToken.token,
          sessionValidUntil: new Date(sessionResponse.accessToken.validUntil),
          lastSessionReferenceNumber: sessionResponse.referenceNumber,
        })
        .where(eq(ksefCredentials.companyId, companyId));

      return {
        success: true,
        message: "Połączenie z KSeF nawiązane pomyślnie.",
        validUntil: sessionResponse.accessToken.validUntil,
      };
    } catch (error) {
      // Log full error for debugging
      if (process.env.NODE_ENV === "development") {
        console.error("KSeF connection error:", error);
      }

      // Map known KSeF error codes to user-friendly messages
      if (error instanceof Error && error.message?.includes("21418")) {
        throw new SafeError("Nieprawidłowy NIP lub Token.");
      }

      // For other errors, provide generic message
      throw new SafeError(
        "Nie udało się nawiązać połączenia z KSeF. Sprawdź poprawność danych."
      );
    }
  }

  /**
   * Checks if user has access to company via company_members table
   * 
   * @param userId - User ID to check
   * @param companyId - Company ID to check access for
   * @param allowedRoles - Optional array of allowed roles
   * @returns Company member record if access is granted
   * @throws SafeError if user doesn't have access or insufficient permissions
   */
  private async ensureUserHasAccess(
    userId: string,
    companyId: number,
    allowedRoles?: CompanyRole[]
  ): Promise<CompanyMember> {
    const [member] = await db
      .select()
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      throw new SafeError("Brak dostępu do tej firmy.");
    }

    // Type guard for role checking
    const memberRole = member.role as CompanyRole;

    if (allowedRoles && !allowedRoles.includes(memberRole)) {
      throw new SafeError(
        "Brak wystarczających uprawnień do wykonania tej operacji."
      );
    }

    return member;
  }

  /**
   * Creates company, assigns owner, and saves credentials
   * 
   * Note: neon-http driver (Vercel serverless) doesn't support transactions.
   * Manual rollback is performed on error instead.
   * 
   * @param data - Company creation data with KSeF token
   * @returns Created company record
   * @throws SafeError if company with NIP exists or validation fails
   * @throws EncryptionError if token encryption fails
   */
  async createCompanyWithKsef(data: CreateCompanyDto): Promise<Company> {
    // Validate token early
    if (!data.ksefToken || data.ksefToken.trim().length === 0) {
      throw new SafeError("Token KSeF jest wymagany");
    }

    // Check if company already exists
    const [existing] = await db
      .select()
      .from(companies)
      .where(eq(companies.nip, data.nip))
      .limit(1);

    if (existing) {
      throw new SafeError("Firma o podanym NIP już istnieje w systemie.");
    }

    let newCompany: Company | undefined;

    try {
      // Create company
      [newCompany] = await db
        .insert(companies)
        .values({
          name: data.name,
          nip: data.nip,
          addressData: data.address,
        })
        .returning();

      if (!newCompany) {
        throw new Error("Failed to create company record");
      }

      // Assign user as OWNER
      await db.insert(companyMembers).values({
        companyId: newCompany.id,
        userId: data.userId,
        role: "OWNER",
      });

      // Encrypt and save KSeF token
      const encryptedToken = encrypt(data.ksefToken.trim());

      await db.insert(ksefCredentials).values({
        companyId: newCompany.id,
        environment: this.DEFAULT_KSEF_ENV,
        authorizationToken: encryptedToken,
      });

      return newCompany;
    } catch (error) {
      // Manual rollback: delete company if it was created
      if (newCompany?.id) {
        try {
          await db.delete(companies).where(eq(companies.id, newCompany.id));
        } catch (rollbackError) {
          // Log rollback failure but don't throw
          if (process.env.NODE_ENV === "development") {
            console.error("Rollback failed:", rollbackError);
          }
        }
      }

      // Re-throw safe errors as-is
      if (error instanceof SafeError || error instanceof EncryptionError) {
        throw error;
      }

      // Log unexpected errors
      if (process.env.NODE_ENV === "development") {
        console.error("Unexpected error creating company:", error);
      }

      throw new SafeError(
        "Nie udało się utworzyć firmy. Spróbuj ponownie."
      );
    }
  }

  /**
   * Finds all companies that the user belongs to
   * 
   * @param userId - User ID to search for
   * @returns Array of companies (empty if user has no companies)
   */
  public async findUserCompanies(userId: string): Promise<Company[]> {
    const result = await db
      .select({
        id: companies.id,
        name: companies.name,
        nip: companies.nip,
        addressData: companies.addressData,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .innerJoin(companyMembers, eq(companyMembers.companyId, companies.id))
      .where(eq(companyMembers.userId, userId));

    return result;
  }
}