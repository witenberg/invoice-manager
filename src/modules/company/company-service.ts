import { db } from '@/db';
import { companies } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { KsefClient } from '@/modules/ksef/client';

export class CompanyService {
  /**
   * Sprawdza połączenie dla konkretnej firmy użytkownika
   */
  async testConnection(userId: string, companyId: number) {
    // 1. Pobierz firmę (i upewnij się, że należy do usera!)
    const [company] = await db
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.id, companyId),
          eq(companies.userId, userId)
        )
      )
      .limit(1);

    if (!company) throw new Error('Nie znaleziono firmy lub brak dostępu.');
    if (!company.encryptedKsefToken) throw new Error('Firma nie ma skonfigurowanego tokena KSeF.');

    // 2. Odszyfruj token (tutaj używamy naszego helpera)
    const rawToken = decrypt(company.encryptedKsefToken);

    // 3. Wywołaj klienta KSeF
    const ksefClient = new KsefClient();
    
    try {
      // Próbujemy się zalogować
      const sessionTokens = await ksefClient.login(company.nip, rawToken);
      
      // Sukces? Zaktualizujmy status w bazie
    //   await db.update(companies)
    //     .set({ ksefStatus: 'CONNECTED' }) // Zakładając, że masz takie pole (enum/text)
    //     .where(eq(companies.id, companyId));

      return { success: true, validUntil: sessionTokens.accessToken.validUntil };
      
    } catch (error) {
      console.error('Błąd połączenia KSeF:', error);
      
    //   // Błąd? Zapiszmy to
    //   await db.update(companies)
    //     .set({ ksefStatus: 'ERROR' })
    //     .where(eq(companies.id, companyId));
        
      throw new Error('Błąd autoryzacji w KSeF. Sprawdź poprawność tokena.');
    }
  }
}