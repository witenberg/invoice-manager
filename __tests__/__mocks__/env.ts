// Mock for src/env.ts - used in Jest tests
// This avoids issues with @t3-oss/env-nextjs ESM module in Jest

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test',
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || 'postgresql://test',
  KSEF_BASE_URL: process.env.KSEF_BASE_URL || 'https://ksef-test.mf.gov.pl/api',
  APP_SECRET_KEY: process.env.APP_SECRET_KEY || '12345678901234567890123456789012',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
};

