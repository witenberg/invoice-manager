import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const KSEF_BASE_URL = process.env.KSEF_BASE_URL;

// Typ dla odpowiedzi z endpointu /security/public-key-certificates
interface PublicKeyCertificateDto {
  certificate: string; // Base64 DER
  validFrom: string;
  validTo: string;
  usage: string[]; // np. ["KsefTokenEncryption"]
}

export class KsefCrypto {
  private baseUrl = KSEF_BASE_URL as string;
  
  // Cache w pamięci (działa w ramach "ciepłej" funkcji serverless)
  private cachedPublicKey: string | null = null;

  /**
   * Pobiera klucz publiczny z API MF.
   * Szuka tego, który ma usage: "KsefTokenEncryption".
   */
  private async getPublicKey(): Promise<string> {
    if (this.cachedPublicKey) {
      return this.cachedPublicKey;
    }

    console.log('hz Pobieranie klucza publicznego z KSeF API...');
    
    const url = `${this.baseUrl}/security/public-key-certificates`;
    const res = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Nie udało się pobrać kluczy KSeF: ${res.status}`);
    }

    const certs = await res.json() as PublicKeyCertificateDto[];

    // Szukamy klucza do autoryzacji
    const authCert = certs.find(c => c.usage.includes('KsefTokenEncryption'));

    if (!authCert) {
      throw new Error('Nie znaleziono certyfikatu o przeznaczeniu KsefTokenEncryption');
    }

    // API zwraca czysty Base64 (DER). Node.js woli format PEM z nagłówkami.
    // Musimy to "opakować".
    const pem = `-----BEGIN CERTIFICATE-----\n${authCert.certificate}\n-----END CERTIFICATE-----`;
    
    this.cachedPublicKey = pem;
    return pem;
  }

  /**
   * Szyfruje token (Asynchronicznie, bo musi najpierw pobrać klucz!)
   */
  public async encryptToken(apiToken: string, challengeTimestamp: string): Promise<string> {
    const publicKey = await this.getPublicKey();
    
    const timestampMs = new Date(challengeTimestamp).getTime();
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