import { db } from "@/db";
import { ksefCredentials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { KsefAuthService } from "./auth-service";

/**
 * KSeF Session Manager
 * 
 * Intelligent session token management with automatic refresh.
 * Ensures that all KSeF operations use a valid, non-expired session token.
 * 
 * Features:
 * - Checks token validity before each use
 * - Automatically refreshes expired tokens
 * - Caches tokens in database
 * - Thread-safe (prevents multiple simultaneous refreshes)
 */
export class KsefSessionManager {
  private readonly authService: KsefAuthService;
  
  /**
   * Buffer time before token expiration (in milliseconds)
   * Refresh token 5 minutes before it actually expires
   */
  private readonly TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * In-memory lock to prevent multiple concurrent refresh operations
   * for the same company
   */
  private static refreshLocks = new Map<number, Promise<string>>();

  constructor() {
    this.authService = new KsefAuthService();
  }

  /**
   * Gets a valid session token for the given company
   * 
   * Workflow:
   * 1. Fetch token from database
   * 2. Check if token is valid (not expired)
   * 3. If valid, return it
   * 4. If expired, refresh token and return new one
   * 
   * @param companyId - Company ID
   * @returns Valid session token
   * @throws Error if credentials not found or refresh fails
   */
  public async getValidSessionToken(companyId: number): Promise<string> {
    // Check if there's already a refresh in progress for this company
    const existingRefresh = KsefSessionManager.refreshLocks.get(companyId);
    if (existingRefresh) {
      console.log(`[KSeF] Waiting for existing token refresh for company ${companyId}`);
      return await existingRefresh;
    }

    // Fetch credentials from database
    const credentials = await this.getCredentials(companyId);

    // Check if we have a session token and if it's still valid
    if (credentials.sessionToken && credentials.sessionValidUntil) {
      if (this.isTokenValid(credentials.sessionValidUntil)) {
        console.log(`[KSeF] Using cached session token for company ${companyId}`);
        return credentials.sessionToken;
      }

      console.log(`[KSeF] Session token expired for company ${companyId}, refreshing...`);
    } else {
      console.log(`[KSeF] No session token found for company ${companyId}, generating new one...`);
    }

    // Token expired or doesn't exist - refresh it
    const refreshPromise = this.refreshSessionToken(companyId, credentials);
    
    // Store the promise to prevent concurrent refreshes
    KsefSessionManager.refreshLocks.set(companyId, refreshPromise);

    try {
      const newToken = await refreshPromise;
      return newToken;
    } finally {
      // Clean up the lock after refresh completes (success or failure)
      KsefSessionManager.refreshLocks.delete(companyId);
    }
  }

  /**
   * Checks if a token is still valid (not expired)
   * 
   * @param validUntil - Token expiration date
   * @returns true if token is valid, false if expired or about to expire
   */
  private isTokenValid(validUntil: Date): boolean {
    const now = new Date();
    const expirationWithBuffer = new Date(
      validUntil.getTime() - this.TOKEN_REFRESH_BUFFER_MS
    );

    return now < expirationWithBuffer;
  }

  /**
   * Refreshes the session token by performing a new login
   * 
   * @param companyId - Company ID
   * @param credentials - Existing credentials
   * @returns New session token
   * @throws Error if refresh fails
   */
  private async refreshSessionToken(
    companyId: number,
    credentials: {
      nip: string;
      authorizationToken: string;
      environment: string;
    }
  ): Promise<string> {
    try {
      // Decrypt authorization token
      const rawAuthToken = decrypt(credentials.authorizationToken);

      // Perform full login to get new session token
      const authResult = await this.authService.login(credentials.nip, rawAuthToken);

      // Update database with new session token
      await db
        .update(ksefCredentials)
        .set({
          sessionToken: authResult.accessToken.token,
          sessionValidUntil: new Date(authResult.accessToken.validUntil),
        })
        .where(eq(ksefCredentials.companyId, companyId));

      console.log(
        `[KSeF] Session token refreshed successfully for company ${companyId}`,
        `Valid until: ${authResult.accessToken.validUntil}`
      );

      return authResult.accessToken.token;
    } catch (error) {
      console.error(`[KSeF] Failed to refresh session token for company ${companyId}:`, error);
      throw new Error(
        `Nie udało się odświeżyć tokenu sesji KSeF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Fetches KSeF credentials from database
   * 
   * @param companyId - Company ID
   * @returns Credentials with decrypted authorization token
   * @throws Error if credentials not found
   */
  private async getCredentials(
    companyId: number
  ): Promise<{
    nip: string;
    authorizationToken: string;
    environment: string;
    sessionToken: string | null;
    sessionValidUntil: Date | null;
  }> {
    // Import companies table dynamically to avoid circular dependency
    const { companies } = await import("@/db/schema");

    const result = await db
      .select({
        credentials: ksefCredentials,
        companyNip: companies.nip,
      })
      .from(ksefCredentials)
      .innerJoin(companies, eq(ksefCredentials.companyId, companies.id))
      .where(eq(ksefCredentials.companyId, companyId))
      .limit(1);

    if (!result.length || !result[0].credentials) {
      throw new Error(
        `Brak skonfigurowanych danych KSeF dla firmy o ID ${companyId}. Skonfiguruj połączenie w ustawieniach firmy.`
      );
    }

    const { credentials, companyNip } = result[0];

    if (!credentials.authorizationToken) {
      throw new Error(
        "Brak tokena autoryzacyjnego KSeF. Skonfiguruj token w ustawieniach firmy."
      );
    }

    return {
      nip: companyNip,
      authorizationToken: credentials.authorizationToken,
      environment: credentials.environment,
      sessionToken: credentials.sessionToken,
      sessionValidUntil: credentials.sessionValidUntil,
    };
  }

  /**
   * Forces a token refresh for a specific company
   * 
   * Useful when you know the token is invalid (e.g., after receiving
   * a 401 error from KSeF API) and want to force a refresh regardless
   * of the expiration date stored in database.
   * 
   * @param companyId - Company ID
   * @returns New session token
   */
  public async forceRefreshToken(companyId: number): Promise<string> {
    console.log(`[KSeF] Force refreshing token for company ${companyId}`);
    
    const credentials = await this.getCredentials(companyId);
    return await this.refreshSessionToken(companyId, credentials);
  }

  /**
   * Manually invalidates the cached token for a company
   * 
   * This will force the next getValidSessionToken call to refresh.
   * Useful for logout scenarios or when you know the token is no longer valid.
   * 
   * @param companyId - Company ID
   */
  public async invalidateToken(companyId: number): Promise<void> {
    await db
      .update(ksefCredentials)
      .set({
        sessionToken: null,
        sessionValidUntil: null,
      })
      .where(eq(ksefCredentials.companyId, companyId));

    console.log(`[KSeF] Token invalidated for company ${companyId}`);
  }
}

