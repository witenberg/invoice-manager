import { env } from "@/env";
import type {
  AuthChallengeResponse,
  AuthKsefTokenRequest,
  SignatureResponse,
  AuthStatusResponse,
  AuthTokenResponse,
  OpenOnlineSessionRequest,
  OpenOnlineSessionResponse,
  SubmitInvoiceRequest,
  SubmitInvoiceResponse,
  CloseOnlineSessionResponse,
  OnlineSessionStatusResponse,
  FailedSessionInvoicesResponse,
  SessionInvoiceStatusResponse,
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
 * Low-level HTTP communication with Polish National e-Invoice System (KSeF)
 * 
 * This class contains ONLY raw API methods. Business logic orchestration
 * should be implemented in services layer (e.g. KsefAuthService).
 * 
 * @see https://www.gov.pl/web/kas/ksef
 */
export class KsefClient {
  /** Base URL for KSeF API (test/production environment) */
  private readonly baseUrl = env.KSEF_BASE_URL;

  constructor() {}

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

      // Handle network errors (timeout, DNS, connection refused, etc.)
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorName = error instanceof Error ? error.name : "UnknownError";
      
      // Log network errors for debugging (especially in tests)
      if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
        console.error(
          `[KSeF] Network error on ${options.method || "GET"} ${endpoint}:`,
          {
            errorName,
            errorMessage,
            url,
            endpoint,
          }
        );
      }

      throw new KsefApiError(
        `Network error while calling KSeF API: ${errorMessage}`,
        undefined, // No status code for network errors
        undefined  // No response body for network errors
      );
    }
  }

  /**
   * Step 1: Get authentication challenge from KSeF
   * 
   * @returns Challenge data with timestamp
   * @throws KsefApiError if request fails
   */
  public async getChallenge(): Promise<AuthChallengeResponse> {
    return await this.fetchJson<AuthChallengeResponse>(
      "/auth/challenge",
      { method: "POST" }
    );
  }

  /**
   * Step 2: Initialize KSeF session with encrypted token
   * 
   * @param request - Auth request with encrypted token
   * @returns Reference number and temporary authentication token for polling
   * @throws KsefApiError if request fails
   */
  public async initializeSession(
    request: AuthKsefTokenRequest
  ): Promise<SignatureResponse> {
    return await this.fetchJson<SignatureResponse>(
      "/auth/ksef-token",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Step 3: Check authorization status (used for polling)
   * 
   * @param referenceNumber - Reference number from initializeSession
   * @param tempToken - Temporary token from initializeSession
   * @returns Status with code (200 = success, 2xx/3xx = processing, 4xx = error)
   * @throws KsefApiError if request fails
   */
  public async getAuthStatus(
    referenceNumber: string,
    tempToken: string
  ): Promise<AuthStatusResponse> {
    return await this.fetchJson<AuthStatusResponse>(
      `/auth/${referenceNumber}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${tempToken}` },
      }
    );
  }

  /**
   * Step 4: Redeem final access token after successful authorization
   * 
   * @param tempToken - Temporary token from initializeSession (after status is 200)
   * @returns Final session token with expiration
   * @throws KsefApiError if request fails
   */
  public async redeemToken(tempToken: string): Promise<AuthTokenResponse> {
    return await this.fetchJson<AuthTokenResponse>(
      "/auth/token/redeem",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tempToken}`,
        },
      }
    );
  }

  // ===========================
  // Invoice Session Methods
  // ===========================

  /**
   * Opens an online interactive session for invoice submission
   * 
   * This session allows sending individual invoices with specified schema
   * and encryption settings. The session must be closed after all invoices
   * are submitted to generate collective UPO.
   * 
   * @param sessionToken - Active KSeF session token (from authentication)
   * @param request - Session configuration with form code and encryption data
   * @returns Session reference number and expiration date
   * @throws KsefApiError if request fails (400/401/403)
   * 
   * @see https://www.gov.pl/web/kas/ksef - KSeF API documentation
   */
  public async openOnlineSession(
    sessionToken: string,
    request: OpenOnlineSessionRequest
  ): Promise<OpenOnlineSessionResponse> {
    return await this.fetchJson<OpenOnlineSessionResponse>(
      "/sessions/online",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Submits encrypted invoice to an open interactive session
   * 
   * Accepts encrypted invoice with metadata and hashes, then starts
   * processing. The invoice must be encrypted with the session key
   * provided during session opening.
   * 
   * @param sessionToken - Active KSeF session token
   * @param sessionReferenceNumber - Session reference number from openOnlineSession
   * @param request - Invoice data with encryption, hashes, and metadata
   * @returns Invoice reference number for tracking processing status
   * @throws KsefApiError if request fails (400/401/403)
   * 
   * Response 202 (Accepted) means invoice processing has started.
   * Use the returned reference number to check processing status.
   */
  public async submitInvoice(
    sessionToken: string,
    sessionReferenceNumber: string,
    request: SubmitInvoiceRequest
  ): Promise<SubmitInvoiceResponse> {
    return await this.fetchJson<SubmitInvoiceResponse>(
      `/sessions/online/${sessionReferenceNumber}/invoices`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Gets status of an interactive online session
   * 
   * Returns current session status including processing state,
   * invoice counts, and UPO download URLs (if session is closed).
   * 
   * @param sessionToken - Active KSeF session token
   * @param sessionReferenceNumber - Session reference number from openOnlineSession
   * @returns Session status with invoice counts and UPO data (if available)
   * @throws KsefApiError if request fails (400/401/403)
   * 
   * Status codes:
   * - 200: Session processed successfully (UPO available)
   * - 2xx/3xx: Session still processing
   * - 4xx: Session error
   */
  public async getOnlineSessionStatus(
    sessionToken: string,
    sessionReferenceNumber: string
  ): Promise<OnlineSessionStatusResponse> {
    return await this.fetchJson<OnlineSessionStatusResponse>(
      `/sessions/${sessionReferenceNumber}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
  }

  /**
   * Gets failed invoices from an interactive online session
   * 
   * Returns a list of invoices that failed to process during the session.
   * 
   * @param sessionToken - Active KSeF session token
   * @param sessionReferenceNumber - Session reference number from openOnlineSession
   * @returns List of failed invoices with status details
   * @throws KsefApiError if request fails (400)
   */
  public async getFailedSessionInvoices(
    sessionToken: string,
    sessionReferenceNumber: string
  ): Promise<FailedSessionInvoicesResponse> {
    return await this.fetchJson<FailedSessionInvoicesResponse>(
      `/sessions/${sessionReferenceNumber}/invoices/failed`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
  }

  /**
   * Closes an interactive session and starts collective UPO generation
   * 
   * After closing, no more invoices can be submitted to this session.
   * The system will generate collective UPO (Official Receipt Confirmation)
   * for all invoices submitted in this session.
   * 
   * @param sessionToken - Active KSeF session token
   * @param sessionReferenceNumber - Session reference number from openOnlineSession
   * @returns Reference number for tracking UPO generation (or empty object if 204)
   * @throws KsefApiError if request fails (400/401/403)
   * 
   * After successful closure, use the reference number to retrieve
   * the collective UPO document.
   * 
   * Note: KSeF returns 204 No Content on success, so we handle empty response.
   */
  public async closeOnlineSession(
    sessionToken: string,
    sessionReferenceNumber: string
  ): Promise<CloseOnlineSessionResponse> {
    const url = `${this.baseUrl}/sessions/online/${sessionReferenceNumber}/close`;
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${sessionToken}`,
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();

        if (process.env.NODE_ENV === "development") {
          console.error(
            `[KSeF] POST /sessions/online/${sessionReferenceNumber}/close failed: ${res.status}`,
            errorText
          );
        }

        throw new KsefApiError(
          `KSeF Request Failed: ${res.status}`,
          res.status,
          errorText
        );
      }

      // 204 No Content means success with empty body
      if (res.status === 204) {
        return {} as CloseOnlineSessionResponse;
      }

      // For other success codes, try to parse JSON
      const text = await res.text();
      if (!text) {
        return {} as CloseOnlineSessionResponse;
      }

      return JSON.parse(text) as CloseOnlineSessionResponse;
    } catch (error) {
      if (error instanceof KsefApiError) {
        throw error;
      }

      // Handle network errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorName = error instanceof Error ? error.name : "UnknownError";
      
      if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
        console.error(
          `[KSeF] Network error on POST /sessions/online/${sessionReferenceNumber}/close:`,
          {
            errorName,
            errorMessage,
            url,
            endpoint: `/sessions/online/${sessionReferenceNumber}/close`,
          }
        );
      }

      throw new KsefApiError(
        `Network error while calling KSeF API: ${errorMessage}`,
        undefined,
        undefined
      );
    }
  }

  /**
   * Gets status of a specific invoice in a session
   * 
   * Returns invoice status including processing state, errors, and KSeF number
   * if the invoice was successfully processed.
   * 
   * @param sessionToken - Active KSeF session token
   * @param sessionReferenceNumber - Session reference number from openOnlineSession
   * @param invoiceReferenceNumber - Invoice reference number from submitInvoice
   * @returns Invoice status with processing details
   * @throws KsefApiError if request fails (400/401/403)
   * 
   * Status codes in response.status.code:
   * - 200: Invoice processed successfully
   * - 4xx: Invoice processing failed (e.g., 440 = duplicate invoice)
   */
  public async getInvoiceStatus(
    sessionToken: string,
    sessionReferenceNumber: string,
    invoiceReferenceNumber: string
  ): Promise<SessionInvoiceStatusResponse> {
    return await this.fetchJson<SessionInvoiceStatusResponse>(
      `/sessions/${sessionReferenceNumber}/invoices/${invoiceReferenceNumber}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
  }

  /**
   * Gets UPO (Official Receipt Confirmation) for a specific invoice
   * 
   * Returns XML document containing UPO with KSeF number and confirmation details.
   * UPO is available only after invoice is successfully processed (status 200).
   * 
   * @param sessionToken - Active KSeF session token
   * @param sessionReferenceNumber - Session reference number from openOnlineSession
   * @param invoiceReferenceNumber - Invoice reference number from submitInvoice
   * @returns UPO XML document as string
   * @throws KsefApiError if request fails (400/401/403) or UPO not available yet
   * 
   * Response is XML (application/xml), not JSON.
   */
  public async getInvoiceUpo(
    sessionToken: string,
    sessionReferenceNumber: string,
    invoiceReferenceNumber: string
  ): Promise<string> {
    const url = `${this.baseUrl}/sessions/${sessionReferenceNumber}/invoices/${invoiceReferenceNumber}/upo`;
    const headers = {
      Accept: "application/xml",
      Authorization: `Bearer ${sessionToken}`,
    };

    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();

        if (process.env.NODE_ENV === "development") {
          console.error(
            `[KSeF] GET /sessions/${sessionReferenceNumber}/invoices/${invoiceReferenceNumber}/upo failed: ${res.status}`,
            errorText
          );
        }

        throw new KsefApiError(
          `KSeF Request Failed: ${res.status}`,
          res.status,
          errorText
        );
      }

      // UPO is returned as XML, not JSON
      const upoXml = await res.text();
      return upoXml;
    } catch (error) {
      if (error instanceof KsefApiError) {
        throw error;
      }

      // Handle network errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorName = error instanceof Error ? error.name : "UnknownError";
      
      if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
        console.error(
          `[KSeF] Network error on GET /sessions/${sessionReferenceNumber}/invoices/${invoiceReferenceNumber}/upo:`,
          {
            errorName,
            errorMessage,
            url,
            endpoint: `/sessions/${sessionReferenceNumber}/invoices/${invoiceReferenceNumber}/upo`,
          }
        );
      }

      throw new KsefApiError(
        `Network error while calling KSeF API: ${errorMessage}`,
        undefined,
        undefined
      );
    }
  }
}