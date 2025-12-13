// Jest setup file for environment variables and global mocks

// Load .env.test file if exists
require('dotenv').config({ path: '.env.test' });

// Mock environment variables for KSeF tests
process.env.KSEF_BASE_URL = process.env.KSEF_BASE_URL || 'https://ksef-test.mf.gov.pl/api';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test';
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || 'postgresql://test';
process.env.APP_SECRET_KEY = process.env.APP_SECRET_KEY || '12345678901234567890123456789012';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';

// Support both naming conventions for test variables
if (process.env.TEST_KSEF_NIP && !process.env.KSEF_TEST_NIP) {
  process.env.KSEF_TEST_NIP = process.env.TEST_KSEF_NIP;
}
if (process.env.TEST_KSEF_TOKEN && !process.env.KSEF_TEST_TOKEN) {
  process.env.KSEF_TEST_TOKEN = process.env.TEST_KSEF_TOKEN;
}

// Mock Next.js cache if needed
global.fetch = global.fetch || require('node-fetch');

