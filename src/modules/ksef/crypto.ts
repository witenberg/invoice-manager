import * as crypto from "crypto";
import { env } from "@/env";

/**
 * Global cached public key
 * Persists as long as serverless function stays warm
 */
let globalCachedKey: string | null = null;

/**
 * Public key certificate from KSeF API
 */
interface PublicKeyCertificateDto {
  certificate: string; // Base64 DER format
  validFrom: string;
  validTo: string;
  usage: string[]; // e.g. ["KsefTokenEncryption", "SymmetricKeyEncryption"]
}

/**
 * Type guard to validate public key certificate structure
 */
function isValidCertificate(obj: unknown): obj is PublicKeyCertificateDto {
  if (typeof obj !== "object" || obj === null) return false;

  const cert = obj as Record<string, unknown>;

  return (
    typeof cert.certificate === "string" &&
    typeof cert.validFrom === "string" &&
    typeof cert.validTo === "string" &&
    Array.isArray(cert.usage) &&
    cert.usage.every((u) => typeof u === "string")
  );
}

/**
 * Custom error for cryptographic operations
 */
export class KsefCryptoError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "KsefCryptoError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KsefCryptoError);
    }
  }
}

/**
 * Cryptographic utilities for KSeF API
 * Handles token encryption with RSA-OAEP
 */
export class KsefCrypto {
  private readonly baseUrl = env.KSEF_BASE_URL;
  private readonly CACHE_DURATION_SECONDS = 86400; // 24 hours

  /**
   * Fetches public key from KSeF API with caching strategy:
   * 1. RAM cache (globalCachedKey) - fastest (warm serverless function)
   * 2. Next.js Data Cache - fast (cold start)
   * 3. KSeF API - slowest (when cache expires)
   * 
   * @throws KsefCryptoError if fetching or parsing fails
   */
  private async getPublicKey(): Promise<string> {
    // Check RAM cache first
    if (globalCachedKey) {
      return globalCachedKey;
    }

    const url = `${this.baseUrl}/security/public-key-certificates`;

    try {
      // Fetch with Next.js caching (24 hours)
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        next: { revalidate: this.CACHE_DURATION_SECONDS },
      });

      if (!res.ok) {
        throw new KsefCryptoError(
          `Failed to fetch KSeF public keys: HTTP ${res.status}`
        );
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new KsefCryptoError("Invalid response format: expected array");
      }

      // Validate and find certificate for token encryption
      const validCerts = data.filter(isValidCertificate);

      if (validCerts.length === 0) {
        throw new KsefCryptoError("No valid certificates found in response");
      }

      const authCert = validCerts.find((c) =>
        c.usage.includes("KsefTokenEncryption")
      );

      if (!authCert) {
        throw new KsefCryptoError(
          "KsefTokenEncryption certificate not found"
        );
      }

      // Format to PEM
      const pem = this.formatToPem(authCert.certificate);

      // Cache in RAM for future calls
      globalCachedKey = pem;

      return pem;
    } catch (error) {
      if (error instanceof KsefCryptoError) {
        throw error;
      }

      throw new KsefCryptoError(
        `Failed to fetch public key: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
    }
  }

  /**
   * Formats base64 certificate to PEM format
   */
  private formatToPem(base64Cert: string): string {
    return `-----BEGIN CERTIFICATE-----\n${base64Cert}\n-----END CERTIFICATE-----`;
  }

  /**
   * Encrypts token using RSA-OAEP with SHA-256
   * 
   * @param apiToken - KSeF authorization token
   * @param challengeTimestamp - Challenge timestamp from KSeF
   * @returns Base64 encoded encrypted token
   * @throws KsefCryptoError if encryption fails
   */
  public async encryptToken(
    apiToken: string,
    challengeTimestamp: string
  ): Promise<string> {
    if (!apiToken || apiToken.trim().length === 0) {
      throw new KsefCryptoError("API token cannot be empty");
    }

    if (!challengeTimestamp) {
      throw new KsefCryptoError("Challenge timestamp cannot be empty");
    }

    try {
      const publicKey = await this.getPublicKey();

      // Convert timestamp to milliseconds (API v2 requirement)
      const timestampMs = new Date(challengeTimestamp).getTime();

      if (isNaN(timestampMs)) {
        throw new KsefCryptoError("Invalid challenge timestamp format");
      }

      // Format: "token|timestamp"
      const message = `${apiToken}|${timestampMs}`;
      const buffer = Buffer.from(message, "utf8");

      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        buffer
      );

      return encrypted.toString("base64");
    } catch (error) {
      if (error instanceof KsefCryptoError) {
        throw error;
      }

      throw new KsefCryptoError(
        `Token encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
    }
  }
}