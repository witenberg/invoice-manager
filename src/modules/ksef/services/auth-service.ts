import { KsefClient, KsefApiError } from "../client";
import { KsefCrypto } from "../crypto";
import type { AuthTokenResponse, AuthKsefTokenRequest } from "../types";

/**
 * KSeF Authentication Service
 * Handles business logic for KSeF authentication flows
 * 
 * Responsibilities:
 * - Login (full challenge-encrypt-poll-redeem flow)
 * - Token refresh
 * - Session validation
 */
export class KsefAuthService {
  private readonly client: KsefClient;
  private readonly crypto: KsefCrypto;

  /** Configuration for polling */
  private readonly MAX_POLL_RETRIES = 15;
  private readonly POLL_DELAY_MS = 2000;

  constructor() {
    this.client = new KsefClient();
    this.crypto = new KsefCrypto();
  }

  /**
   * Performs full KSeF login flow
   * 
   * Business flow:
   * 1. Get challenge from KSeF
   * 2. Encrypt token with public key + challenge
   * 3. Initialize session with encrypted token
   * 4. Poll until authorization complete
   * 5. Redeem final access token
   * 
   * @param nip - Company NIP (tax identification number)
   * @param ksefToken - KSeF authorization token
   * @returns Access token and session details
   * @throws KsefApiError if any step fails
   */
  public async login(
    nip: string,
    ksefToken: string
  ): Promise<AuthTokenResponse> {
    // Validate inputs
    if (!nip || nip.length !== 10) {
      throw new KsefApiError("Invalid NIP format (must be 10 digits)");
    }

    if (!ksefToken || ksefToken.trim().length === 0) {
      throw new KsefApiError("KSeF token cannot be empty");
    }

    try {
      // Step 1: Get challenge from KSeF
      const challengeRes = await this.client.getChallenge();

      // Step 2: Encrypt token with public key and challenge
      const encryptedToken = await this.crypto.encryptToken(
        ksefToken,
        challengeRes.timestamp
      );

      // Step 3: Initialize session with encrypted token
      const authBody: AuthKsefTokenRequest = {
        challenge: challengeRes.challenge,
        contextIdentifier: {
          type: "Nip",
          value: nip,
        },
        encryptedToken: encryptedToken,
      };

      const signatureRes = await this.client.initializeSession(authBody);

      // Step 4: Poll until authorization is complete
      await this.waitForAuthCompletion(
        signatureRes.referenceNumber,
        signatureRes.authenticationToken.token
      );

      // Step 5: Redeem final access token
      const tokens = await this.client.redeemToken(
        signatureRes.authenticationToken.token
      );

      return tokens;
    } catch (error) {
      if (error instanceof KsefApiError) {
        throw error;
      }

      throw new KsefApiError(
        `KSeF login failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Polls KSeF until authorization is complete
   * Waits up to 30 seconds (15 retries * 2 seconds)
   * 
   * @throws KsefApiError if authorization fails or times out
   */
  private async waitForAuthCompletion(
    refNumber: string,
    tempToken: string
  ): Promise<void> {
    for (let i = 0; i < this.MAX_POLL_RETRIES; i++) {
      await new Promise((resolve) => setTimeout(resolve, this.POLL_DELAY_MS));

      const res = await this.client.getAuthStatus(refNumber, tempToken);
      const code = res.status.code;

      if (code === 200) {
        return; // Success
      }

      if (code >= 400) {
        throw new KsefApiError(
          `KSeF authorization failed: ${res.status.description}`,
          code
        );
      }

      // Status code 2xx-3xx: Still processing, continue polling
    }

    throw new KsefApiError("KSeF authorization timeout after 30 seconds");
  }

  /**
   * Refreshes existing session token
   * 
   * @param sessionToken - Current session token
   * @returns New token response with extended validity
   * @throws KsefApiError if refresh fails
   * 
   * @todo Implement token refresh endpoint call
   */
  public async refreshToken(sessionToken: string): Promise<AuthTokenResponse> {
    // TODO: Implement when needed for invoice sending
    // Endpoint: POST /auth/token/refresh
    throw new Error("Token refresh not yet implemented");
  }

  /**
   * Validates if session token is still active
   * 
   * @param sessionToken - Session token to validate
   * @returns true if token is valid and active
   * @throws KsefApiError if validation fails
   * 
   * @todo Implement session validation endpoint call
   */
  public async validateSession(sessionToken: string): Promise<boolean> {
    // TODO: Implement when needed
    // Endpoint: GET /auth/session/status
    throw new Error("Session validation not yet implemented");
  }

  /**
   * Terminates active KSeF session (logout)
   * 
   * @param sessionToken - Session token to terminate
   * @throws KsefApiError if logout fails
   * 
   * @todo Implement session termination endpoint call
   */
  public async logout(sessionToken: string): Promise<void> {
    // TODO: Implement when needed
    // Endpoint: DELETE /auth/session
    throw new Error("Logout not yet implemented");
  }
}

