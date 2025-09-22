import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Salt rounds for bcrypt (10 is a good balance between security and performance)
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against its hash
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error('Failed to verify password');
  }
}

/**
 * Generate a secure random token for email verification
 * @param length - Length of the token (default: 32)
 * @returns string - Random token
 */
export function generateVerificationToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Password validation according to requirements
 * @param password - Password to validate
 * @returns object - Validation result with isValid boolean and error message
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  // Minimum 7 characters
  if (password.length < 7) {
    return {
      isValid: false,
      error: 'Password must be at least 7 characters long'
    };
  }

  // Must contain at least one special character
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;
  if (!specialCharRegex.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one special character'
    };
  }

  return { isValid: true };
}

/**
 * Check if verification token is expired
 * @param expiresAt - Token expiration timestamp
 * @returns boolean - True if token is expired
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}

/**
 * Generate verification token expiration date (24 hours from now)
 * @returns Date - Expiration date
 */
export function generateTokenExpiration(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24); // 24 hours from now
  return expiration;
}