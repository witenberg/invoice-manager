/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/env$': '<rootDir>/__tests__/__mocks__/env.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^server-only$': '<rootDir>/__tests__/__mocks__/server-only.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  // Transform node_modules that use ESM
  transformIgnorePatterns: [
    'node_modules/(?!(@t3-oss/env-nextjs|@t3-oss/env-core)/)',
  ],
  // Mock environment variables for tests
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Timeout dla testów integracyjnych (KSeF może być wolny)
  testTimeout: 60000,
};

module.exports = config;

