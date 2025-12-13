import * as crypto from "crypto";
import { env } from "@/env";

/**
 * Global cached public keys
 * Persists as long as serverless function stays warm
 * Stores both token and symmetric encryption keys separately
 */
let globalCachedKeys: { token?: string; symmetric?: string } | null = null;

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
 * AES encryption result with key and IV
 */
export interface AesEncryptionResult {
  /** Encrypted data (base64) */
  encryptedData: string;
  /** AES-256 symmetric key (32 bytes, base64) */
  symmetricKey: string;
  /** Initialization vector (16 bytes, base64) */
  initializationVector: string;
  /** RSA encrypted symmetric key with MF public key (base64) */
  encryptedSymmetricKey: string;
}

/**
 * Invoice hash calculation result
 */
export interface InvoiceHashes {
  /** SHA256 hash of original XML (base64) */
  originalHash: string;
  /** Size of original XML in bytes */
  originalSize: number;
  /** SHA256 hash of encrypted XML (base64) */
  encryptedHash: string;
  /** Size of encrypted XML in bytes */
  encryptedSize: number;
}

/**
 * Cryptographic utilities for KSeF API
 * Low-level crypto operations: RSA-OAEP, AES-256-CBC, SHA-256
 * 
 * This class contains ONLY raw cryptographic methods.
 * For business logic (e.g. full invoice encryption + submission flow),
 * use KsefClient + KsefCrypto directly in your service layer.
 */
export class KsefCrypto {
  private readonly baseUrl = env.KSEF_BASE_URL;
  private readonly CACHE_DURATION_SECONDS = 86400; // 24 hours
  
  /** AES-256 requires 32-byte key */
  private readonly AES_KEY_SIZE = 32;
  /** AES-CBC requires 16-byte IV */
  private readonly AES_IV_SIZE = 16;

  /**
   * Fetches public key from KSeF API with caching strategy:
   * 1. RAM cache (globalCachedKeys) - fastest (warm serverless function)
   * 2. Next.js Data Cache - fast (cold start)
   * 3. KSeF API - slowest (when cache expires)
   * 
   * @param usage - Type of encryption: 'token' for token encryption, 'symmetric' for symmetric key encryption
   * @returns PEM-formatted public key certificate
   * @throws KsefCryptoError if fetching or parsing fails
   */
  public async getPublicKey(usage: 'token' | 'symmetric' = 'token'): Promise<string> {
    // Check RAM cache first for the requested key type
    if (globalCachedKeys?.[usage]) {
      return globalCachedKeys[usage];
    }

    const url = `${this.baseUrl}/security/public-key-certificates`;
    console.log('🔑 [DEBUG] Fetching public key from:', url);

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

      // Validate certificates
      const validCerts = data.filter(isValidCertificate);

      if (validCerts.length === 0) {
        throw new KsefCryptoError("No valid certificates found in response");
      }

      // Initialize cache object if not exists
      if (!globalCachedKeys) {
        globalCachedKeys = {};
      }

      // Find and cache both key types if available
      const tokenCert = validCerts.find((c) => c.usage.includes('KsefTokenEncryption'));
      const symmetricCert = validCerts.find((c) => c.usage.includes('SymmetricKeyEncryption'));

      if (tokenCert) {
        globalCachedKeys.token = this.formatToPem(tokenCert.certificate);
      }

      if (symmetricCert) {
        globalCachedKeys.symmetric = this.formatToPem(symmetricCert.certificate);
      }

      // Select certificate based on usage type
      const requiredUsage = usage === 'token' ? 'KsefTokenEncryption' : 'SymmetricKeyEncryption';
      const fallbackUsage = usage === 'token' ? 'SymmetricKeyEncryption' : 'KsefTokenEncryption';

      // First try to find certificate with exact usage
      let authCert = validCerts.find((c) => c.usage.includes(requiredUsage));

      // If not found, try fallback (should not happen in production, but for safety)
      if (!authCert) {
        authCert = validCerts.find((c) => c.usage.includes(fallbackUsage));
      }

      if (!authCert) {
        throw new KsefCryptoError(
          `${requiredUsage} certificate not found in KSeF response`
        );
      }

      // Format to PEM
      const pem = this.formatToPem(authCert.certificate);

      // Ensure the requested key is cached (should already be cached above, but double-check)
      if (!globalCachedKeys[usage]) {
        globalCachedKeys[usage] = pem;
      }

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
    const cleanBase64 = base64Cert.replace(/\s/g, '');
    const chunks = cleanBase64.match(/.{1,64}/g) || [];
    return `-----BEGIN CERTIFICATE-----\n${chunks.join('\n')}\n-----END CERTIFICATE-----`;
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
      const publicKey = await this.getPublicKey('token');

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

  /**
   * Generates a random AES-256 symmetric key
   * @returns 32-byte key encoded in base64
   */
  private generateSymmetricKey(): string {
    return crypto.randomBytes(this.AES_KEY_SIZE).toString("base64");
  }

  /**
   * Generates a random initialization vector for AES-CBC
   * @returns 16-byte IV encoded in base64
   */
  private generateIV(): string {
    return crypto.randomBytes(this.AES_IV_SIZE).toString("base64");
  }

  /**
   * Encrypts symmetric key with RSA-OAEP using MF public key
   * 
   * @param keyBuffer - Raw AES key bytes (Buffer)
   * @returns Base64 encoded encrypted key
   * @throws KsefCryptoError if encryption fails
   */
  private async encryptSymmetricKey(keyBuffer: Buffer): Promise<string> {
    try {
      const pemCert = await this.getPublicKey('symmetric');

      if (!pemCert || !pemCert.includes('BEGIN CERTIFICATE')) {
        throw new KsefCryptoError('Invalid public key certificate format');
     }
      
     const encrypted = crypto.publicEncrypt(
      {
        key: pemCert,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      keyBuffer
    );

      return encrypted.toString("base64");
    } catch (error) {
      throw new KsefCryptoError(
        `Symmetric key encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
    }
  }

  /**
   * Encrypts XML invoice with AES-256-CBC
   * 
   * @param xmlContent - XML invoice as string
   * @returns Encryption result with encrypted data, keys, and IV
   * @throws KsefCryptoError if encryption fails
   */
  public async encryptInvoice(xmlContent: string): Promise<AesEncryptionResult> {
    if (!xmlContent || xmlContent.trim().length === 0) {
      throw new KsefCryptoError("XML content cannot be empty");
    }

    try {
      // Generate random key and IV
      const keyBuffer = crypto.randomBytes(this.AES_KEY_SIZE); 
      const ivBuffer = crypto.randomBytes(this.AES_IV_SIZE); 

      const dataBuffer = Buffer.from(xmlContent, "utf8");

      const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, ivBuffer);
      const encryptedBuffer = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final()
      ]);

      const encryptedSymmetricKeyBase64 = await this.encryptSymmetricKey(keyBuffer);

      return {
        encryptedData: encryptedBuffer.toString("base64"),
        symmetricKey: keyBuffer.toString("base64"), 
        initializationVector: ivBuffer.toString("base64"),
        encryptedSymmetricKey: encryptedSymmetricKeyBase64,
      };
    } catch (error) {
      if (error instanceof KsefCryptoError) {
        throw error;
      }

      throw new KsefCryptoError(
        `Invoice encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
    }
  }

  /**
   * Encrypts XML invoice with existing session key (for multiple invoices in one session)
   * IMPORTANT: Generates NEW IV for each invoice (security best practice)
   * 
   * @param xmlContent - XML invoice as string
   * @param sessionKey - Base64 encoded session symmetric key
   * @returns Object with encrypted invoice and NEW IV used
   * @throws KsefCryptoError if encryption fails
   */
  public encryptInvoiceWithSessionKey(
    xmlContent: string,
    sessionKey: string
  ): { encryptedData: string; iv: string } {
    if (!xmlContent || xmlContent.trim().length === 0) {
      throw new KsefCryptoError("XML content cannot be empty");
    }

    if (!sessionKey) {
      throw new KsefCryptoError("Session key is required");
    }

    try {
      // Generate NEW IV for this invoice (security requirement)
      const newIV = this.generateIV();
      
      const keyBuffer = Buffer.from(sessionKey, "base64");
      const ivBuffer = Buffer.from(newIV, "base64");
      const dataBuffer = Buffer.from(xmlContent, "utf8");

      // Encrypt with AES-256-CBC
      const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, ivBuffer);
      
      const encryptedChunks: Buffer[] = [];
      encryptedChunks.push(cipher.update(dataBuffer));
      encryptedChunks.push(cipher.final());
      
      const encryptedBuffer = Buffer.concat(encryptedChunks);
      
      return {
        encryptedData: encryptedBuffer.toString("base64"),
        iv: newIV,
      };
    } catch (error) {
      throw new KsefCryptoError(
        `Invoice encryption with session key failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
    }
  }

  /**
   * Calculates SHA-256 hash of content
   * 
   * @param content - String or Buffer to hash
   * @returns Base64 encoded SHA-256 hash (44 characters)
   */
  public calculateHash(content: string | Buffer): string {
    const buffer = typeof content === "string" 
      ? Buffer.from(content, "utf8") 
      : content;
    
    return crypto.createHash("sha256").update(buffer).digest("base64");
  }

  /**
   * Calculates all required hashes for invoice submission
   * 
   * @param originalXml - Original XML invoice content
   * @param encryptedXmlBase64 - Base64 encoded encrypted invoice
   * @returns Object with all hashes and sizes
   */
  public calculateInvoiceHashes(
    originalXml: string,
    encryptedXmlBase64: string
  ): InvoiceHashes {
    if (!originalXml || !encryptedXmlBase64) {
      throw new KsefCryptoError("Both original and encrypted XML must be provided");
    }

    const originalBuffer = Buffer.from(originalXml, "utf8");
    const encryptedBuffer = Buffer.from(encryptedXmlBase64, "base64");

    return {
      originalHash: this.calculateHash(originalBuffer),
      originalSize: originalBuffer.length,
      encryptedHash: this.calculateHash(encryptedBuffer),
      encryptedSize: encryptedBuffer.length,
    };
  }
}