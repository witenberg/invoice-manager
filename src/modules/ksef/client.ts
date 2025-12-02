import { KsefCrypto } from './crypto';
import { env } from '@/env';
import type { 
  AuthChallengeResponse, 
  AuthKsefTokenRequest, 
  SignatureResponse, 
  AuthStatusResponse, 
  AuthTokenResponse 
} from './types';

/**
 * KSeF API Client
 * Handles communication with Polish National e-Invoice System (KSeF)
 * 
 * @see https://www.gov.pl/web/kas/ksef
 */
export class KsefClient {
  /** Base URL for KSeF API (test/production environment) */
  private baseUrl = env.KSEF_BASE_URL;
  private crypto: KsefCrypto;

  constructor() {
    this.crypto = new KsefCrypto();
  }

  /**
   * Makes authenticated request to KSeF API
   */
  private async fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[KSeF] ${options.method || 'GET'} ${endpoint} failed: ${res.status}`, errorText);
      throw new Error(`KSeF Request Failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Performs full KSeF login flow
   * Steps: Challenge -> Encrypt -> Auth Request -> Poll -> Redeem Token
   * 
   * @param nip - Company NIP (tax identification number)
   * @param ksefToken - KSeF authorization token
   * @returns Access token and session details
   */
  public async login(nip: string, ksefToken: string): Promise<AuthTokenResponse> {
    // Step 1: Get challenge from KSeF
    const challengeRes = await this.fetchJson<AuthChallengeResponse>('/auth/challenge', { method: 'POST' });
    
    // Step 2: Encrypt token with public key and challenge
    const encryptedToken = await this.crypto.encryptToken(ksefToken, challengeRes.timestamp);

    // Step 3: Send auth request
    const authBody: AuthKsefTokenRequest = {
      challenge: challengeRes.challenge,
      contextIdentifier: {
        type: 'Nip',
        value: nip
      },
      encryptedToken: encryptedToken
    };

    const signatureRes = await this.fetchJson<SignatureResponse>('/auth/ksef-token', {
      method: 'POST',
      body: JSON.stringify(authBody)
    });

    // Step 4: Poll until authorization is complete
    await this.waitForAuthCompletion(signatureRes.referenceNumber, signatureRes.authenticationToken.token);

    // Step 5: Redeem final access token
    const tokens = await this.fetchJson<AuthTokenResponse>('/auth/token/redeem', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${signatureRes.authenticationToken.token}`
      }
    });

    return tokens;
  }

  /**
   * Polls KSeF until authorization is complete
   * Waits up to 30 seconds (15 retries * 2 seconds)
   */
  private async waitForAuthCompletion(refNumber: string, tempToken: string): Promise<void> {
    const maxRetries = 15;
    const retryDelay = 2000; // 2 seconds
    
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));

      const res = await this.fetchJson<AuthStatusResponse>(`/auth/${refNumber}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tempToken}` }
      });

      const code = res.status.code;

      if (code === 200) return; // Success
      if (code >= 400) {
        throw new Error(`KSeF authorization failed: ${res.status.description}`);
      }
    }
    
    throw new Error('KSeF authorization timeout');
  }
}