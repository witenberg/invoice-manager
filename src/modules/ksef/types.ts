// GET /auth/challenge
export interface AuthChallengeResponse {
    timestamp: string;
    challenge: string;
  }
  
  // POST /auth/ksef-token (Request)
  export interface AuthKsefTokenRequest {
    challenge: string;
    contextIdentifier: {
      type: 'Nip';    // Wielka litera!
      value: string;  // 'value', nie 'identifier'!
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