import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/**
 * Hashes a plain-text password using Node's native `scrypt` with a 16-byte random salt.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

/**
 * Verifies a plain-text password against a stored `scrypt:<salt>:<hash>` digest.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, salt, originalHex] = parts;
  if (!salt || !originalHex) return false;

  try {
    const derived = scryptSync(password, salt, KEY_LENGTH);
    const original = Buffer.from(originalHex, "hex");
    if (derived.length !== original.length) return false;
    return timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

