import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '@/env';
import * as schema from './schema';

// 1. Konfiguracja połączenia SQL
const sql = neon(env.DATABASE_URL);

// 2. Singleton dla trybu developerskiego (zapobieganie wyciekom połączeń)
const globalForDb = global as unknown as {
  conn: ReturnType<typeof drizzle> | undefined;
};

// 3. Inicjalizacja instancji Drizzle
export const db = globalForDb.conn ?? drizzle(sql, { schema });

// 4. Zapisanie połączenia do cache w trybie DEV
if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = db;
}