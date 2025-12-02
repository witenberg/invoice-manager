import { env } from '@/env';
import { KsefCrypto } from './crypto';
import type { 
  AuthChallengeResponse, 
  AuthKsefTokenRequest, 
  SignatureResponse, 
  AuthStatusResponse, 
  AuthTokenResponse 
} from './types';

export class KsefClient {
  // UWAGA: Base URL dla środowiska TESTOWEGO z API v2
  private baseUrl = process.env.KSEF_BASE_URL as string;
  private crypto: KsefCrypto;

  constructor() {
    this.crypto = new KsefCrypto();
  }

  private async fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    console.log(`📡 [KSeF] ${options.method || 'GET'} ${endpoint}`);
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ [KSeF Error] ${res.status}:`, errorText);
      throw new Error(`KSeF Request Failed: ${res.status} ${errorText}`);
    }

    return res.json() as Promise<T>;
  }

  public async login(nip: string, ksefToken: string): Promise<AuthTokenResponse> {
    console.log('🚀 Rozpoczynam logowanie (API v2)...');

    // 1. Challenge
    const challengeRes = await this.fetchJson<AuthChallengeResponse>('/auth/challenge', { method: 'POST' });
    console.log('✅ Challenge:', challengeRes.challenge);
    
    // API v2 wymaga timestampu w milisekundach
    const encryptedToken = await this.crypto.encryptToken(ksefToken, challengeRes.timestamp);

    // 3. Auth Request (Struktura zgodna z Twoją dokumentacją)
    const authBody: AuthKsefTokenRequest = {
      challenge: challengeRes.challenge,
      contextIdentifier: {
        type: 'Nip',   // Dokumentacja: "type": "Nip"
        value: nip     // Dokumentacja: "value": "5265877635"
      },
      encryptedToken: encryptedToken
    };

    const signatureRes = await this.fetchJson<SignatureResponse>('/auth/ksef-token', {
      method: 'POST',
      body: JSON.stringify(authBody)
    });
    console.log('✅ Auth Request wysłany. Ref:', signatureRes.referenceNumber);

    // 4. Polling (Czekamy na status 200)
    await this.waitForAuthCompletion(signatureRes.referenceNumber, signatureRes.authenticationToken.token);

    // 5. Redeem (Odbiór JWT)
    // Dokumentacja nie pokazuje body w redeem, tylko nagłówek Authorization
    const tokens = await this.fetchJson<AuthTokenResponse>('/auth/token/redeem', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${signatureRes.authenticationToken.token}`
      }
    });

    console.log('🎉 ZALOGOWANO! Token wygasa:', tokens.accessToken.validUntil);
    return tokens;
  }

  private async waitForAuthCompletion(refNumber: string, tempToken: string): Promise<void> {
    const maxRetries = 15;
    
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, 2000)); // Czekaj 2s

      const res = await this.fetchJson<AuthStatusResponse>(`/auth/${refNumber}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tempToken}` }
      });

      const code = res.status.code;
      console.log(`⏳ Status: ${code} - ${res.status.description}`);

      if (code === 200) return; // Sukces
      if (code >= 400) throw new Error(`Błąd autoryzacji: ${res.status.description}`);
    }
    throw new Error('Timeout logowania');
  }
}