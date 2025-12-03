import { KsefCrypto } from "./crypto";
import { env } from "@/env";
import type {
  AuthChallengeResponse,
  AuthKsefTokenRequest,
  SignatureResponse,
  AuthStatusResponse,
  AuthTokenResponse,
} from "./types";

/**
 * Custom error for KSeF API failures
 */
export class KsefApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "KsefApiError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KsefApiError);
    }
  }
}

/**
 * KSeF API Client
 * Handles communication with Polish National e-Invoice System (KSeF)
 * 
 * @see https://www.gov.pl/web/kas/ksef
 */
export class KsefClient {
  /** Base URL for KSeF API (test/production environment) */
  private readonly baseUrl = env.KSEF_BASE_URL;
  private readonly crypto: KsefCrypto;

  /** Configuration for polling */
  private readonly MAX_POLL_RETRIES = 15;
  private readonly POLL_DELAY_MS = 2000;

  constructor() {
    this.crypto = new KsefCrypto();
  }

  /**
   * Makes authenticated request to KSeF API
   * 
   * @throws KsefApiError if request fails
   */
  private async fetchJson<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    try {
      const res = await fetch(url, { ...options, headers });

      if (!res.ok) {
        const errorText = await res.text();

        // Log only in development
        if (process.env.NODE_ENV === "development") {
          console.error(
            `[KSeF] ${options.method || "GET"} ${endpoint} failed: ${res.status}`,
            errorText
          );
        }

        throw new KsefApiError(
          `KSeF Request Failed: ${res.status}`,
          res.status,
          errorText
        );
      }

      const data = await res.json();
      return data as T;
    } catch (error) {
      if (error instanceof KsefApiError) {
        throw error;
      }

      // Handle network errors
      throw new KsefApiError(
        `Network error while calling KSeF API: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Performs full KSeF login flow
   * Steps: Challenge -> Encrypt -> Auth Request -> Poll -> Redeem Token
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
      const challengeRes = await this.fetchJson<AuthChallengeResponse>(
        "/auth/challenge",
        { method: "POST" }
      );

      // Step 2: Encrypt token with public key and challenge
      const encryptedToken = await this.crypto.encryptToken(
        ksefToken,
        challengeRes.timestamp
      );

      // Step 3: Send auth request
      const authBody: AuthKsefTokenRequest = {
        challenge: challengeRes.challenge,
        contextIdentifier: {
          type: "Nip",
          value: nip,
        },
        encryptedToken: encryptedToken,
      };

      const signatureRes = await this.fetchJson<SignatureResponse>(
        "/auth/ksef-token",
        {
          method: "POST",
          body: JSON.stringify(authBody),
        }
      );

      // Step 4: Poll until authorization is complete
      await this.waitForAuthCompletion(
        signatureRes.referenceNumber,
        signatureRes.authenticationToken.token
      );

      // Step 5: Redeem final access token
      const tokens = await this.fetchJson<AuthTokenResponse>(
        "/auth/token/redeem",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${signatureRes.authenticationToken.token}`,
          },
        }
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

      const res = await this.fetchJson<AuthStatusResponse>(
        `/auth/${refNumber}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${tempToken}` },
        }
      );

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
}