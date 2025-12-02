import { describe, it, expect, beforeAll } from 'vitest';
import { KsefClient } from '../src/modules/ksef/client';
import dotenv from 'dotenv';

// Ładujemy zmienne z .env.test
dotenv.config({ path: '.env.test' });

const NIP = process.env.TEST_KSEF_NIP;
const TOKEN = process.env.TEST_KSEF_TOKEN;

// Pomijamy testy jeśli nie ma zmiennych (np. w CI bez sekretów)
const runLiveTests = NIP && TOKEN ? describe : describe.skip;

runLiveTests('KSeF Live Integration (API v2)', () => {
  // Zwiększamy timeout, bo KSeF potrafi zamulać (logowanie trwa kilka sekund)
  const TIMEOUT = 30_000; 

  it('should successfully login and retrieve session token', async () => {
    const client = new KsefClient();
    
    console.log(`Testowanie logowania dla NIP: ${NIP}`);

    const response = await client.login(NIP!, TOKEN!);

    // Asercje - sprawdzamy czy dostaliśmy to co trzeba
    expect(response).toBeDefined();
    expect(response.accessToken).toBeDefined();
    expect(response.accessToken.token).toBeTruthy();
    expect(response.accessToken.token.length).toBeGreaterThan(50);
    
    // Sprawdź czy data ważności jest w przyszłości
    const validUntil = new Date(response.accessToken.validUntil);
    expect(validUntil.getTime()).toBeGreaterThan(Date.now());

    console.log('✅ Token sesyjny odebrany poprawnie');
  }, TIMEOUT);
});