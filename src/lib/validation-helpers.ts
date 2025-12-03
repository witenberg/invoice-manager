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

