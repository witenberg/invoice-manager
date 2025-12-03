/**
 * KSeF (Polish National e-Invoice System) Type Definitions
 * Shared types for KSeF API integration
 */

/**
 * KSeF environment configuration
 */
export type KsefEnvironment = "test" | "prod";

/**
 * Company role types
 */
export type CompanyRole = "OWNER" | "ACCOUNTANT" | "EMPLOYEE";

/**
 * KSeF session response with access token
 */
export interface KsefSessionResponse {
  accessToken: {
    token: string;
    validUntil: string;
  };
  referenceNumber: string;
}

/**
 * Result of KSeF connection test
 */
export interface KsefConnectionResult {
  success: boolean;
  message: string;
  validUntil: string;
}

