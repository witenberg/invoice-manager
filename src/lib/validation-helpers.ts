/**
 * Validation Helper Functions
 * Common validation utilities for forms and data
 */

/**
 * Validates Polish NIP (Tax Identification Number)
 * 
 * @param nip - NIP number to validate
 * @returns True if valid
 */
export function isValidNip(nip: string): boolean {
  // Remove any non-digit characters
  const cleanNip = nip.replace(/\D/g, "");

  // NIP must be exactly 10 digits
  if (cleanNip.length !== 10) {
    return false;
  }

  // Validate checksum
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNip[i]) * weights[i];
  }

  const checksum = sum % 11;
  const lastDigit = parseInt(cleanNip[9]);

  return checksum === lastDigit || (checksum === 10 && lastDigit === 0);
}

/**
 * Validates Polish postal code
 * 
 * @param postalCode - Postal code to validate
 * @returns True if valid (XX-XXX format)
 */
export function isValidPostalCode(postalCode: string): boolean {
  const postalCodeRegex = /^\d{2}-\d{3}$/;
  return postalCodeRegex.test(postalCode);
}

/**
 * Validates building/apartment number
 * Accepts: "1", "12", "12A", "12/3", "12A/3"
 * 
 * @param number - Building or apartment number
 * @returns True if valid format
 */
export function isValidBuildingNumber(number: string): boolean {
  const buildingNumberRegex = /^\d+[A-Za-z]?(\/\d+[A-Za-z]?)?$/;
  return buildingNumberRegex.test(number.trim());
}

/**
 * Validates city name (no digits allowed)
 * 
 * @param city - City name to validate
 * @returns True if valid (contains only letters, spaces, and Polish characters)
 */
export function isValidCityName(city: string): boolean {
  // Polish characters included: ąćęłńóśźż
  const cityRegex = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-]+$/;
  return cityRegex.test(city.trim()) && city.trim().length >= 2;
}

/**
 * Validates KSeF authorization token format
 * Token should be at least 30 characters (base64-like format with possible padding)
 * 
 * @param token - KSeF token to validate
 * @returns True if valid format
 */
export function isValidKsefToken(token: string): boolean {
  const cleanToken = token.trim();
  // KSeF tokens are typically 30+ characters in base64/base64url format
  // May contain A-Z, a-z, 0-9, +, /, -, _, and = (padding)
  return (
    cleanToken.length >= 30 &&
    cleanToken.length <= 2000 &&
    /^[A-Za-z0-9+/\-_=|]+$/.test(cleanToken)
  );
}

/**
 * Validates email format
 * More strict than basic regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates phone number (Polish format)
 * Accepts: +48XXXXXXXXX, 48XXXXXXXXX, XXXXXXXXX
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s-]/g, "");
  const phoneRegex = /^(\+48|48)?[4-9]\d{8}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Validates password strength
 * 
 * @param password - Password to validate
 * @returns Object with validation result and details
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    feedback.push("Hasło musi mieć co najmniej 8 znaków");
  } else {
    score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push("Dodaj wielką literę");
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push("Dodaj małą literę");
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    feedback.push("Dodaj cyfrę");
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push("Dodaj znak specjalny");
  } else {
    score += 1;
  }

  return {
    isValid: score >= 3 && password.length >= 8,
    score,
    feedback,
  };
}

/**
 * Sanitizes string input (removes dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .trim();
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates file extension
 */
export function hasValidExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
}

/**
 * Validates file size
 */
export function isValidFileSize(
  sizeInBytes: number,
  maxSizeInMB: number
): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
}



