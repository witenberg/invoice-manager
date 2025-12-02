import * as crypto from 'crypto';
import { env } from '@/env';

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
 * Cryptographic utilities for KSeF API
 * Handles token encryption with RSA-OAEP
 */
export class KsefCrypto {
  private baseUrl = env.KSEF_BASE_URL;

  /**
   * Fetches public key from KSeF API with caching strategy:
   * 1. RAM cache (globalCachedKey) - fastest (warm serverless function)
   * 2. Next.js Data Cache - fast (cold start)
   * 3. KSeF API - slowest (when cache expires)
   */
  private async getPublicKey(): Promise<string> {
    // Check RAM cache first
    if (globalCachedKey) {
      return globalCachedKey;
    }
    
    const url = `${this.baseUrl}/security/public-key-certificates`;
    
    // Fetch with Next.js caching (24 hours)
    const res = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 } // 24 hours - keys change rarely
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch KSeF public keys: ${res.status}`);
    }

    const certs = await res.json() as PublicKeyCertificateDto[];

    // Find certificate for token encryption
    const authCert = certs.find(c => c.usage.includes('KsefTokenEncryption'));

    if (!authCert) {
      throw new Error('KsefTokenEncryption certificate not found');
    }

    // Format to PEM
    const pem = this.formatToPem(authCert.certificate);
    
    // Cache in RAM for future calls
    globalCachedKey = pem;
    
    return pem;
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
   */
  public async encryptToken(apiToken: string, challengeTimestamp: string): Promise<string> {
    const publicKey = await this.getPublicKey();
    
    // Convert timestamp to milliseconds (API v2 requirement)
    const timestampMs = new Date(challengeTimestamp).getTime();
    
    // Format: "token|timestamp"
    const message = `${apiToken}|${timestampMs}`;
    const buffer = Buffer.from(message, 'utf8');

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer
    );

    return encrypted.toString('base64');
  }
}