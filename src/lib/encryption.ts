import "server-only";
import crypto from "crypto";
import { env } from "@/env";

/**
 * Encryption Configuration
 * Using AES-256-CBC for sensitive data encryption
 */
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const SECRET_KEY = env.APP_SECRET_KEY;

/**
 * Custom error for encryption-related failures
 */
export class EncryptionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "EncryptionError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EncryptionError);
    }
  }
}

/**
 * Encrypts plain text using AES-256-CBC
 * 
 * @param text - Plain text to encrypt
 * @returns Encrypted text in format "iv:encryptedData" (hex encoded)
 * @throws EncryptionError if encryption fails
 */
export function encrypt(text: string): string {
  if (!text || typeof text !== "string") {
    throw new EncryptionError("Invalid input: text must be a non-empty string");
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(SECRET_KEY, "utf8"),
      iv
    );

    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (error) {
    throw new EncryptionError("Failed to encrypt data", error);
  }
}

/**
 * Decrypts encrypted text using AES-256-CBC
 * 
 * @param encryptedText - Encrypted text in format "iv:encryptedData"
 * @returns Decrypted plain text
 * @throws EncryptionError if decryption fails or format is invalid
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string") {
    throw new EncryptionError("Invalid input: encryptedText must be a non-empty string");
  }

  try {
    const parts = encryptedText.split(":");

    if (parts.length !== 2) {
      throw new EncryptionError("Invalid encrypted text format (expected 'iv:data')");
    }

    const [ivHex, encryptedHex] = parts;

    if (!ivHex || !encryptedHex) {
      throw new EncryptionError("Invalid encrypted text format (missing iv or data)");
    }

    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(SECRET_KEY, "utf8"),
      iv
    );

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError("Failed to decrypt data", error);
  }
}