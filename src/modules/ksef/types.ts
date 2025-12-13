// ===========================
// Authentication Types
// ===========================

// GET /auth/challenge
export interface AuthChallengeResponse {
    timestamp: string;
    challenge: string;
  }
  
  // POST /auth/ksef-token (Request)
  export interface AuthKsefTokenRequest {
    challenge: string;
    contextIdentifier: {
      type: 'Nip';   
      value: string;
    };
    encryptedToken: string;
  }
  
  // POST /auth/ksef-token (Response)
  export interface SignatureResponse {
    referenceNumber: string;
    authenticationToken: {
      token: string;
    };
  }
  
  // GET /auth/{referenceNumber}
  export interface AuthStatusResponse {
    status: {
      code: number;
      description: string;
    };
  }
  
  // POST /auth/token/redeem
  export interface AuthTokenResponse {
    accessToken: {
      token: string;
      validUntil: string;
    };
    refreshToken: {
      token: string;
      validUntil: string;
    };
  }

// ===========================
// Invoice Session Types
// ===========================

/**
 * Form code schema supported by KSeF
 * 
 * Supported schemas:
 * - FA (2) / FA (3): Standard invoice format
 * - PEF (3): Electronic invoice format
 * - PEF_KOR (3): Electronic invoice correction format
 */
export interface FormCode {
  /** System code (e.g., "FA (2)", "FA (3)", "PEF (3)", "PEF_KOR (3)") */
  systemCode: string;
  /** Schema version (e.g., "1-0E", "2-1") */
  schemaVersion: string;
  /** Form type value (e.g., "FA", "PEF", "PEF_KOR") */
  value: string;
}

/**
 * Symmetric key encryption data
 * Contains encrypted session key and initialization vector
 */
export interface EncryptionData {
  /** Symmetric key encrypted with Ministry of Finance public key (Base64) */
  encryptedSymmetricKey: string;
  /** Initialization vector for AES-256-CBC encryption (Base64) */
  initializationVector: string;
}

// POST /sessions/online (Request)
export interface OpenOnlineSessionRequest {
  /** Schema of invoices to be sent in this session */
  formCode: FormCode;
  /** Encrypted symmetric key for invoice encryption */
  encryption: EncryptionData;
}

// POST /sessions/online (Response)
export interface OpenOnlineSessionResponse {
  /** Session reference number */
  referenceNumber: string;
  /** Session expiration date/time (ISO 8601) */
  validUntil: string;
}

// ===========================
// Invoice Submission Types
// ===========================

/**
 * Invoice submission data
 * Contains encrypted invoice with all required metadata and hashes
 */
export interface SubmitInvoiceRequest {
  /** SHA256 hash of original invoice XML (Base64, 44 chars) */
  invoiceHash: string;
  /** Size of original invoice in bytes */
  invoiceSize: number;
  /** SHA256 hash of encrypted invoice (Base64, 44 chars) */
  encryptedInvoiceHash: string;
  /** Size of encrypted invoice in bytes */
  encryptedInvoiceSize: number;
  /** Encrypted invoice content (AES-256-CBC + PKCS#7, Base64) */
  encryptedInvoiceContent: string;
  /** Offline mode flag */
  offlineMode?: boolean;
  /** SHA256 hash of corrected invoice (Base64, 44 chars) - required for technical corrections */
  hashOfCorrectedInvoice?: string | null;
}

// POST /sessions/online/{referenceNumber}/invoices (Response)
export interface SubmitInvoiceResponse {
  /** Reference number for tracking invoice processing */
  referenceNumber: string;
}

// POST /sessions/online/{referenceNumber}/close (Response)
export interface CloseOnlineSessionResponse {
  /** Reference number for tracking session closure and UPO generation */
  referenceNumber: string;
}

// GET /sessions/online/{referenceNumber} (Response)
export interface OnlineSessionStatusResponse {
  /** Session processing status */
  status: {
    /** Status code (200 = success, 2xx/3xx = processing, 4xx = error) */
    code: number;
    /** Human-readable status description */
    description: string;
  };
  /** Session expiration date/time (ISO 8601) - only present when session is open */
  validUntil?: string;
  /** UPO (Official Receipt Confirmation) data if session is closed */
  upo?: {
    /** List of UPO pages/documents */
    pages: Array<{
      /** Reference number for this UPO page */
      referenceNumber: string;
      /** Download URL for UPO XML document */
      downloadUrl: string;
      /** URL expiration date/time (ISO 8601) */
      downloadUrlExpirationDate: string;
    }>;
  };
  /** Total number of invoices in the session - only present when session is processing/closed */
  invoiceCount?: number;
  /** Number of successfully processed invoices - only present when session is processing/closed */
  successfulInvoiceCount?: number;
  /** Number of failed invoices - only present when session is processing/closed */
  failedInvoiceCount?: number;
}

// GET /sessions/online/{referenceNumber}/invoices/failed (Response)
export interface FailedSessionInvoicesResponse {
  /** Optional continuation token for pagination */
  continuationToken?: string | null;
  /** Array of failed invoices in the session */
  invoices: Array<{
    /** Sequential number of the invoice in the session */
    ordinalNumber: number;
    /** Reference number for tracking this invoice */
    referenceNumber: string;
    /** SHA256 hash of the invoice XML (Base64) */
    invoiceHash: string;
    /** Optional original filename of the invoice */
    invoiceFileName?: string | null;
    /** Date/time when the invoice was submitted (ISO 8601) */
    invoicingDate: string;
    /** Invoice processing status */
    status: {
      /** Status code (e.g., 440 = duplicate invoice) */
      code: number;
      /** Human-readable status description */
      description: string;
      /** Optional array of detailed error messages */
      details?: string[] | null;
      /** Optional additional status extensions */
      extensions?: {
        /** Reference number of the original session where invoice was submitted */
        originalSessionReferenceNumber?: string | null;
        /** Original KSeF number assigned to the invoice */
        originalKsefNumber?: string | null;
      } | null;
    };
  }>;
}

// GET /sessions/{referenceNumber}/invoices/{invoiceReferenceNumber} (Response)
export interface SessionInvoiceStatusResponse {
  /** Sequential number of the invoice in the session */
  ordinalNumber: number;
  /** Reference number for tracking this invoice */
  referenceNumber: string;
  /** Date/time when the invoice was submitted (ISO 8601) */
  invoicingDate: string;
  /** Invoice processing status */
  status: {
    /** Status code (200 = success, 4xx = error, e.g., 440 = duplicate) */
    code: number;
    /** Human-readable status description */
    description: string;
    /** Optional array of detailed error messages */
    details?: string[] | null;
    /** Optional additional status extensions */
    extensions?: {
      /** Reference number of the original session where invoice was submitted */
      originalSessionReferenceNumber?: string | null;
      /** Original KSeF number assigned to the invoice */
      originalKsefNumber?: string | null;
    } | null;
  };
}



// ===========================
// Error Response Types
// ===========================

/**
 * Detailed error information
 */
export interface ExceptionDetail {
  /** Error code */
  exceptionCode: number;
  /** Human-readable error description */
  exceptionDescription: string;
  /** Optional additional error details */
  details?: string[];
}

/**
 * KSeF API error response structure
 */
export interface KsefErrorResponse {
  exception: {
    /** List of detailed errors */
    exceptionDetailList: ExceptionDetail[];
    /** Reference number for this error */
    referenceNumber: string;
    /** Service code identifier */
    serviceCode: string;
    /** Service context identifier */
    serviceCtx: string;
    /** Service name */
    serviceName: string;
    /** Error timestamp (ISO 8601) */
    timestamp: string;
  };
}