import * as crypto from 'crypto';

// Zmienna globalna - przetrwa tak długo, jak żyje kontener (Warm Start)
let globalCachedKey: string | null = null;

// Typ dla odpowiedzi z endpointu /security/public-key-certificates
interface PublicKeyCertificateDto {
  certificate: string; // Base64 DER
  validFrom: string;
  validTo: string;
  usage: string[]; // np. ["KsefTokenEncryption", "SymmetricKeyEncryption"]
}

export class KsefCrypto {
  private baseUrl = process.env.KSEF_BASE_URL as string;

  /**
   * Pobiera klucz publiczny z API MF z uwzględnieniem cache'owania.
   * Priorytety:
   * 1. Pamięć RAM (globalCachedKey) - najszybciej (Warm Lambda)
   * 2. Next.js Data Cache - szybko (Cold Lambda)
   * 3. API MF - wolno (gdy cache wygaśnie)
   */
  private async getPublicKey(): Promise<string> {
    // 1. Sprawdź pamięć RAM (instancja kontenera)
    if (globalCachedKey) {
      return globalCachedKey;
    }

    console.log('hz Pobieranie klucza publicznego (może być z cache Vercel)...');
    
    const url = `${this.baseUrl}/security/public-key-certificates`;
    
    // 2. Fetch z rewalidacją (Next.js Data Cache)
    // Cache'ujemy klucz na 24h (86400 sekund). Klucze MF zmieniają się rzadko.
    const res = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 }
    });

    if (!res.ok) {
      throw new Error(`Nie udało się pobrać kluczy KSeF: ${res.status}`);
    }

    const certs = await res.json() as PublicKeyCertificateDto[];

    // Szukamy klucza do szyfrowania tokena (KsefTokenEncryption)
    // Czasami ten sam klucz ma obie role, ale szukamy konkretnie tej.
    const authCert = certs.find(c => c.usage.includes('KsefTokenEncryption'));

    if (!authCert) {
      throw new Error('Nie znaleziono certyfikatu o przeznaczeniu KsefTokenEncryption');
    }

    // Formatowanie do PEM
    const pem = this.formatToPem(authCert.certificate);
    
    // Zapisz do zmiennej globalnej na przyszłość (dla tego samego kontenera)
    globalCachedKey = pem;
    
    return pem;
  }

  /**
   * Pomocnicza funkcja formatująca czysty Base64 do formatu PEM.
   */
  private formatToPem(base64Cert: string): string {
    // Node.js crypto zazwyczaj radzi sobie z jedną linią w bloku BEGIN/END,
    // ale dobrą praktyką jest standardowy format.
    return `-----BEGIN CERTIFICATE-----\n${base64Cert}\n-----END CERTIFICATE-----`;
  }

  /**
   * Szyfruje token algorytmem RSA-OAEP z SHA-256
   */
  public async encryptToken(apiToken: string, challengeTimestamp: string): Promise<string> {
    const publicKey = await this.getPublicKey();
    
    // Timestamp musi być w milisekundach (API v2)
    const timestampMs = new Date(challengeTimestamp).getTime();
    
    // Format "token|timestamp"
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