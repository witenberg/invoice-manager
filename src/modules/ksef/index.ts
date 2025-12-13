/**
 * KSeF Module - Main Export File
 * 
 * Architecture:
 * - client.ts: Low-level KSeF API communication
 * - crypto.ts: Low-level cryptographic operations
 * - services/: Business logic layer (recommended for application usage)
 * - workflows/: High-level workflows for common use cases
 * - types.ts: TypeScript type definitions
 */

// Services (Business Logic Layer - RECOMMENDED)
export { KsefAuthService } from "./services";

// Low-level utilities (use only if you need direct access)
export { KsefClient, KsefApiError } from "./client";
export { KsefCrypto, KsefCryptoError } from "./crypto";

// Types - Authentication
export type {
  AuthTokenResponse,
  AuthChallengeResponse,
  AuthStatusResponse,
  SignatureResponse,
  AuthKsefTokenRequest,
} from "./types";

// Types - Invoices & Sessions
export type {
  FormCode,
  EncryptionData,
  OpenOnlineSessionRequest,
  OpenOnlineSessionResponse,
  SubmitInvoiceRequest,
  SubmitInvoiceResponse,
  CloseOnlineSessionResponse,
  OnlineSessionStatusResponse,
  FailedSessionInvoicesResponse,
  SessionInvoiceStatusResponse,
  KsefErrorResponse,
  ExceptionDetail,
} from "./types";

// Types - Crypto
export type {
  AesEncryptionResult,
  InvoiceHashes,
} from "./crypto";

