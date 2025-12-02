import { db } from '@/db';
import { companies, companyMembers, ksefCredentials } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/encryption';
import { KsefClient } from '@/modules/ksef/client';
import { SafeError } from '@/types/error-types';

/**
 * Input DTO for company creation
 */
export type CreateCompanyDto = {
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
};

/**
 * Allowed roles for company operations
 */
export type CompanyRole = 'OWNER' | 'ACCOUNTANT' | 'EMPLOYEE';

/**
 * Service handling company-related business logic
 */
export class CompanyService {
  /**
   * Saves KSeF authorization token (encrypted)
   * Used in company settings when user pastes token generated from Ministry of Finance
   */
  async setKsefToken(userId: string, companyId: number, rawToken: string): Promise<{ success: boolean }> {
    // Check permissions
    await this.ensureUserHasAccess(userId, companyId, ['OWNER', 'ACCOUNTANT']);

    // Encrypt token with application key (AES-256)
    const encryptedToken = encrypt(rawToken);

    // Upsert credentials
    await db
      .insert(ksefCredentials)
      .values({
        companyId: companyId,
        environment: 'test', // TODO: Make this configurable (prod/test)
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
   * Tests KSeF connection for a specific company
   * Logs in to KSeF and saves resulting session token
   */
  async testConnection(userId: string, companyId: number): Promise<{
    success: boolean
    message: string
    validUntil: string
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
      throw new SafeError('Nie znaleziono firmy.');
    }
    
    if (!companyData.credentials?.authorizationToken) {
      throw new SafeError('Firma nie ma skonfigurowanego tokena autoryzacyjnego KSeF.');
    }

    // Decrypt authorization token
    let rawAuthToken: string;
    try {
      rawAuthToken = decrypt(companyData.credentials.authorizationToken);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Internal error: Failed to decrypt token');
    }

    // Initialize KSeF client
    const ksefClient = new KsefClient();

    try {
      // Perform full login (Challenge -> Encrypt -> Init -> Redeem)
      const sessionResponse = await ksefClient.login(companyData.nip, rawAuthToken);

      // Success! Save session token in database (cache)
      await db
        .update(ksefCredentials)
        .set({
          sessionToken: sessionResponse.accessToken.token,
          sessionValidUntil: new Date(sessionResponse.accessToken.validUntil),
          lastSessionReferenceNumber: sessionResponse.referenceNumber
        })
        .where(eq(ksefCredentials.companyId, companyId));

      return {
        success: true,
        message: 'Połączenie z KSeF nawiązane pomyślnie.',
        validUntil: sessionResponse.accessToken.validUntil,
      };

    } catch (error) {
      console.error('KSeF connection error:', error);
      
      // Throw user-friendly errors
      if (error instanceof Error && error.message?.includes('21418')) {
        throw new SafeError('Nieprawidłowy NIP lub Token.');
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new SafeError(`Błąd autoryzacji w KSeF: ${errorMessage}`);
    }
  }

  /**
   * Checks if user has access to company via company_members table
   * @throws SafeError if user doesn't have access or insufficient permissions
   */
  private async ensureUserHasAccess(
    userId: string, 
    companyId: number, 
    allowedRoles?: CompanyRole[]
  ): Promise<typeof companyMembers.$inferSelect> {
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
      throw new SafeError('Brak dostępu do tej firmy.');
    }

    if (allowedRoles && !allowedRoles.includes(member.role as CompanyRole)) {
      throw new SafeError('Brak wystarczających uprawnień do wykonania tej operacji.');
    }

    return member;
  }

  /**
   * Creates company, assigns owner, and saves credentials
   * 
   * Note: neon-http driver (Vercel serverless) doesn't support transactions
   * Manual rollback is performed on error instead
   */
  async createCompanyWithKsef(data: CreateCompanyDto): Promise<typeof companies.$inferSelect> {
    // Check if company already exists
    const [existing] = await db
      .select()
      .from(companies)
      .where(eq(companies.nip, data.nip))
      .limit(1);

    if (existing) {
      throw new SafeError('Firma o podanym NIP już istnieje w systemie.');
    }

    let newCompany: typeof companies.$inferSelect | undefined;
    
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

      // Assign user as OWNER
      await db.insert(companyMembers).values({
        companyId: newCompany.id,
        userId: data.userId,
        role: 'OWNER',
      });

      // Encrypt and save KSeF token
      if (!data.ksefToken || data.ksefToken.trim().length === 0) {
        throw new SafeError('Token KSeF jest wymagany');
      }
      
      const encryptedToken = encrypt(data.ksefToken.trim());
      
      await db.insert(ksefCredentials).values({
        companyId: newCompany.id,
        environment: 'test', // TODO: Make this configurable (prod/test)
        authorizationToken: encryptedToken,
      });

      return newCompany;
      
    } catch (error) {
      // Manual rollback: delete company if it was created
      if (newCompany?.id) {
        try {
          await db.delete(companies).where(eq(companies.id, newCompany.id));
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      
      // Re-throw safe errors, wrap others
      if (error instanceof SafeError) {
        throw error;
      }
      
      throw new Error('Failed to create company');
    }
  }

  /**
   * Finds all companies that the user belongs to
   * @returns Array of companies or undefined if user has no companies
   */
  public async findUserCompanies(userId: string): Promise<typeof companies.$inferSelect[] | undefined> {
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

    return result.length > 0 ? result : undefined;
  }
}