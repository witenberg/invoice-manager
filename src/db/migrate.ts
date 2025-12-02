import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error('DATABASE_URL_UNPOOLED is missing in .env');
}

const runMigrate = async () => {
  console.log('Starting migration...');

  const connection = postgres(process.env.DATABASE_URL_UNPOOLED as string, { max: 1 });

  const db = drizzle(connection);

  await migrate(db, { migrationsFolder: 'drizzle' });

  console.log('Migration completed successfully');

  await connection.end();
};

runMigrate().catch((err) => {
  console.error('Migration failed');
  console.error(err);
  process.exit(1);
});