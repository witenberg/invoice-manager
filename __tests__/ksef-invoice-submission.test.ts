import { KsefAuthService } from '../src/modules/ksef/services';
import { KsefClient } from '../src/modules/ksef/client';
import { KsefCrypto } from '../src/modules/ksef/crypto';
import type { EncryptionData, FormCode, OpenOnlineSessionRequest } from '../src/modules/ksef/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Ładujemy zmienne z .env.test
dotenv.config({ path: '.env.test' });

const NIP = process.env.TEST_KSEF_NIP;
const TOKEN = process.env.TEST_KSEF_TOKEN;

// Pomijamy testy jeśli nie ma zmiennych (np. w CI bez sekretów)
const runLiveTests = NIP && TOKEN ? describe : describe.skip;

runLiveTests('KSeF Invoice Submission - Full Workflow', () => {
  // Timeout jest ustawiony globalnie w jest.config.js (60s)

  it('should complete full invoice submission workflow', async () => {
    console.log('\n========================================');
    console.log('🚀 ROZPOCZĘCIE TESTU WYSYŁKI FAKTURY');
    console.log('========================================\n');

    // ===========================
    // KROK 1: Inicjalizacja serwisów
    // ===========================
    console.log('📦 [INIT] Inicjalizacja serwisów KSeF...');
    const authService = new KsefAuthService();
    const client = new KsefClient();
    const crypto = new KsefCrypto();
    console.log('✅ [INIT] Serwisy zainicjalizowane\n');

    // ===========================
    // KROK 2: Wczytanie przykładowej faktury
    // ===========================
    console.log('📄 [FILE] Wczytywanie przykładowej faktury...');
    const invoiceXml = readFileSync(
      join(__dirname, 'fixtures', 'minimal-invoice-fa3.xml'),
      'utf-8'
    );
    console.log(`✅ [FILE] Faktura wczytana (${invoiceXml.length} znaków)\n`);

    // ===========================
    // KROK 3: Autentykacja
    // ===========================
    console.log('🔐 [AUTH] Rozpoczęcie autentykacji...');
    console.log(`    NIP: ${NIP}`);
    
    let sessionToken: string;
    try {
      const authResult = await authService.login(NIP!, TOKEN!);
      sessionToken = authResult.accessToken.token;
      
      console.log('✅ [AUTH] Autentykacja zakończona sukcesem');
      console.log(`    Token ważny do: i${authResult.accessToken.validUntil}`);
      console.log(`    Refresh token: ${authResult.refreshToken.token}`);
      console.log(`    Refresh token valid until: ${authResult.refreshToken.validUntil}`);
      console.log(`    Token length: ${sessionToken.length} chars\n`);
      
      expect(sessionToken).toBeTruthy();
      expect(sessionToken.length).toBeGreaterThan(50);
    } catch (error) {
      console.error('❌ [AUTH] Błąd autentykacji:', error);
      throw error;
    }

    // ===========================
    // KROK 4: Szyfrowanie faktury
    // ===========================
    console.log('🔒 [ENCRYPT] Rozpoczęcie szyfrowania faktury...');
    
    let encryptionResult;
    try {
      encryptionResult = await crypto.encryptInvoice(invoiceXml);
      
      console.log('✅ [ENCRYPT] Faktura zaszyfrowana');
      console.log(`   ${JSON.stringify(encryptionResult, null, 2)}\n`);

    } catch (error) {
      console.error('❌ [ENCRYPT] Błąd szyfrowania:', error);
      throw error;
    }

    // ===========================
    // KROK 5: Obliczanie hashy
    // ===========================
    console.log('🔢 [HASH] Obliczanie hashy faktury...');
    
    let hashes;
    try {
      hashes = crypto.calculateInvoiceHashes(
        invoiceXml,
        encryptionResult.encryptedData
      );
      
      console.log('✅ [HASH] Hashe obliczone');
      console.log(`    Original hash: ${hashes.originalHash}`);
      console.log(`    Original size: ${hashes.originalSize} bytes`);
      console.log(`    Encrypted hash: ${hashes.encryptedHash}`);
      console.log(`    Encrypted size: ${hashes.encryptedSize} bytes\n`);
      
      expect(hashes.originalHash).toBeTruthy();
      expect(hashes.originalSize).toBeGreaterThan(0);
      expect(hashes.encryptedHash).toBeTruthy();
      expect(hashes.encryptedSize).toBeGreaterThan(0);
    } catch (error) {
      console.error('❌ [HASH] Błąd obliczania hashy:', error);
      throw error;
    }

    // ===========================
    // KROK 5.5: Pobranie klucza publicznego (dla szyfrowania klucza symetrycznego)
    // ===========================
    
    const currentPublicKey = await crypto.getPublicKey('symmetric');
    console.log('🔑 [DEBUG] Używany klucz publiczny dla szyfrowania klucza symetrycznego (początek):', currentPublicKey.substring(0, 50));

    // ===========================
    // KROK 6: Otwarcie sesji interaktywnej
    // ===========================
    console.log('🚪 [SESSION] Otwieranie sesji interaktywnej...');
    
    let sessionReferenceNumber: string;
    try {
      const formCode: FormCode = {
        systemCode: 'FA (3)',
        schemaVersion: '1-0E',
        value: 'FA'
      };

      const encryption: EncryptionData = {
        encryptedSymmetricKey: encryptionResult.encryptedSymmetricKey,
        initializationVector: encryptionResult.initializationVector,
      };

      const openOnlineSessionRequest: OpenOnlineSessionRequest = {
        formCode: formCode,
        encryption: encryption,
      };

      console.log('openOnlineSessionRequest', openOnlineSessionRequest); // @TODO

      const sessionResult = await client.openOnlineSession(sessionToken, openOnlineSessionRequest);
      
      sessionReferenceNumber = sessionResult.referenceNumber;
      
      console.log('✅ [SESSION] Sesja otwarta');
      console.log(`    Reference: ${sessionReferenceNumber}`);
      console.log(`    Valid until: ${sessionResult.validUntil}\n`);
      
      expect(sessionReferenceNumber).toBeTruthy();
      expect(sessionResult.validUntil).toBeTruthy();
    } catch (error) {
      console.error('❌ [SESSION] Błąd otwierania sesji:', error);
      if (error instanceof Error) {
        console.error('    Message:', error.message);
        console.error('    Stack:', error.stack);
      }
      throw error;
    }

    // ===========================
    // KROK 6.5: Status sesji PRZED wysłaniem faktury
    // ===========================
    console.log('📊 [STATUS] Sprawdzanie statusu sesji PRZED wysłaniem faktury...');
    
    try {
      const statusBefore = await client.getOnlineSessionStatus(
        sessionToken,
        sessionReferenceNumber
      );
      
      console.log('✅ [STATUS] Status sesji przed wysłaniem:');
      console.log(JSON.stringify(statusBefore, null, 2));
      console.log('');
      
      expect(statusBefore.status).toBeTruthy();
      // invoiceCount może nie być dostępne gdy sesja jest jeszcze otwarta
      if (statusBefore.invoiceCount !== undefined) {
        expect(statusBefore.invoiceCount).toBe(0);
      }
    } catch (error) {
      console.error('❌ [STATUS] Błąd sprawdzania statusu przed wysłaniem:', error);
      if (error instanceof Error) {
        console.error('    Message:', error.message);
      }
      // Nie rzucamy błędu - to tylko informacyjne
    }

    // ===========================
    // KROK 7: Wysyłka faktury
    // ===========================
    console.log('📤 [SUBMIT] Wysyłanie faktury do KSeF...');
    
    let invoiceReferenceNumber: string;
    try {
      const submitResult = await client.submitInvoice(
        sessionToken,
        sessionReferenceNumber,
        {
          invoiceHash: hashes.originalHash,
          invoiceSize: hashes.originalSize,
          encryptedInvoiceHash: hashes.encryptedHash,
          encryptedInvoiceSize: hashes.encryptedSize,
          encryptedInvoiceContent: encryptionResult.encryptedData,
          offlineMode: false,
        }
      );
      
      invoiceReferenceNumber = submitResult.referenceNumber;
      
      console.log('✅ [SUBMIT] Faktura wysłana');
      console.log(`    Invoice reference: ${invoiceReferenceNumber}\n`);
      
      expect(invoiceReferenceNumber).toBeTruthy();
    } catch (error) {
      console.error('❌ [SUBMIT] Błąd wysyłania faktury:', error);
      if (error instanceof Error) {
        console.error('    Message:', error.message);
        console.error('    Stack:', error.stack);
      }
      throw error;
    }

    // ===========================
    // KROK 7.5: Oczekiwanie na przetworzenie faktury
    // ===========================
    console.log('⏳ [WAIT] Faktura wysłana, czekam na przetworzenie...');
    
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let sessionAutoClosed = false;
    let finalStatus;
    
    for (let i = 0; i < 10; i++) {
      await sleep(2000); // Czekaj 2 sekundy
      
      try {
        const status = await client.getOnlineSessionStatus(
          sessionToken,
          sessionReferenceNumber
        );
        
        console.log(`📊 [STATUS] Iteracja ${i + 1}/10 - Aktualny status: ${status.status.code} (${status.status.description})`);
        
        // Sprawdź czy sesja zamknęła się sama (status 415)
        if (status.status.code === 415) {
          console.log('⚠️  [AUTO-CLOSE] Sesja zamknęła się automatycznie (status 415)');
          sessionAutoClosed = true;
          finalStatus = status;
          break;
        }
        
        // Sprawdź czy faktura została przetworzona
        if (status.invoiceCount !== undefined && status.invoiceCount > 0) {
          if (
            (status.successfulInvoiceCount !== undefined && status.successfulInvoiceCount > 0) ||
            (status.failedInvoiceCount !== undefined && status.failedInvoiceCount > 0)
          ) {
            const failedInvoices = await client.getFailedSessionInvoices(
              sessionToken, 
              sessionReferenceNumber
            );
            if (failedInvoices) {
              failedInvoices.invoices.forEach((inv: any) => {
              console.log(`🧾 Faktura ref: ${inv.referenceNumber}`);
              console.log(`   Kod błędu: ${inv.status.code}`);
              console.log(`   Opis: ${inv.status.description}`);
              console.log(`   Detale:`, inv.status.details);
              });
            } else {
              console.log('✅ [PROCESSED] Faktura została przetworzona. Można zamykać sesję.');
              console.log(`    Invoice count: ${status.invoiceCount}`);
              console.log(`    Successful: ${status.successfulInvoiceCount || 0}`);
              console.log(`    Failed: ${status.failedInvoiceCount || 0}`);
              finalStatus = status;
              break;
            }
          }
        }
        
        // Ostatnia iteracja - zapisz status
        if (i === 9) {
          finalStatus = status;
          console.log('⏰ [TIMEOUT] Osiągnięto limit iteracji. Przechodzę do zamykania sesji.');
        }
      } catch (error) {
        console.error(`❌ [STATUS] Błąd sprawdzania statusu (iteracja ${i + 1}):`, error);
        if (error instanceof Error) {
          console.error('    Message:', error.message);
        }
        // Kontynuuj pętlę mimo błędu
      }
    }
    
    if (finalStatus) {
      console.log('\n📋 [FINAL STATUS] Ostateczny status sesji:');
      console.log(JSON.stringify(finalStatus, null, 2));
      console.log('');
    }

    // ===========================
    // KROK 8: Zamknięcie sesji (jeśli nie zamknęła się automatycznie)
    // ===========================
    let closureReferenceNumber: string | undefined;
    
    if (sessionAutoClosed) {
      console.log('⏭️  [CLOSE] Pomijam zamykanie sesji - zamknęła się automatycznie\n');
      
      // Jeśli sesja zamknęła się automatycznie, sprawdź czy mamy UPO
      if (finalStatus?.upo) {
        console.log('📄 [UPO] UPO jest dostępne:');
        console.log(JSON.stringify(finalStatus.upo, null, 2));
        console.log('');
      }
    } else {
      console.log('🔒 [CLOSE] Zamykanie sesji...');
      
      try {
        const closeResult = await client.closeOnlineSession(
          sessionToken,
          sessionReferenceNumber
        );
        
        closureReferenceNumber = closeResult.referenceNumber;
        
        console.log('✅ [CLOSE] Sesja zamknięta');
        console.log(`    Closure reference: ${closureReferenceNumber}`);
        console.log('    UPO generation started\n');
        
        expect(closureReferenceNumber).toBeTruthy();
      } catch (error: any) {
        // Status 415 oznacza że faktury się jeszcze przetwarzają
        // To nie jest krytyczny błąd - sesja zamknie się automatycznie po przetworzeniu
        if (error?.statusCode === 400 && error?.responseBody?.includes?.('"exceptionCode":21180')) {
          console.log('⚠️  [CLOSE] Sesja nie może być zamknięta - faktury są w trakcie przetwarzania');
          console.log('    To normalne zachowanie - KSeF zamknie sesję automatycznie');
          console.log('    Error code: 21180 - Status sesji (415) uniemożliwia zamknięcie\n');
        } else if (error?.statusCode === undefined && error?.responseBody === undefined) {
          // Błąd sieciowy (timeout, DNS, connection refused, etc.)
          console.error('❌ [CLOSE] Błąd sieciowy podczas zamykania sesji:', error);
          console.error('    To może być timeout, problem z połączeniem lub DNS');
          console.error('    Message:', error?.message || 'Unknown error');
          if (error instanceof Error && error.stack) {
            console.error('    Stack:', error.stack);
          }
          // Nie rzucamy błędu - sesja może być już zamknięta lub zamknie się automatycznie
          console.log('    ⚠️  Kontynuuję test - sesja może być już zamknięta\n');
        } else {
          console.error('❌ [CLOSE] Nieoczekiwany błąd zamykania sesji:', error);
          console.error('    Status code:', error?.statusCode);
          console.error('    Response body:', error?.responseBody);
          if (error instanceof Error) {
            console.error('    Message:', error.message);
            console.error('    Stack:', error.stack);
          }
          throw error;
        }
      }
    }

    // ===========================
    // PODSUMOWANIE
    // ===========================
    console.log('\n========================================');
    console.log('✨ TEST ZAKOŃCZONY SUKCESEM!');
    console.log('========================================');
    console.log('\n📊 PODSUMOWANIE:');
    console.log(`  • NIP: ${NIP}`);
    console.log(`  • Session: ${sessionReferenceNumber}`);
    console.log(`  • Invoice: ${invoiceReferenceNumber}`);
    if (closureReferenceNumber) {
      console.log(`  • Closure: ${closureReferenceNumber}`);
    } else {
      console.log(`  • Closure: Pending (sesja zamknie się automatycznie)`);
    }
    console.log('\n✅ Faktura została wysłana do KSeF!');
    console.log('   Możesz sprawdzić jej status w panelu KSeF.\n');
  });
});

