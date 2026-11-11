import crypto from "node:crypto";
import { API_KEY_TOKEN_PREFIX } from "@/lib/apiKeyFormat";

export interface GeneratedApiKeyPair {
  plainTextToken: string;
  keyPrefix: string;
  tokenHash: string;
}

/**
 * Hashes a raw Personal Access Token with SHA-256 for safe database storage and lookup.
 */
export function hashApiKeyToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a high-entropy Personal Access Token (`av_<8-hex>.<base64url>`).
 * The plaintext value should be returned once upon creation and never persisted.
 */
export function generateApiKeyPair(): GeneratedApiKeyPair {
  const prefixId = crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(32).toString("base64url");
  const keyPrefix = `${API_KEY_TOKEN_PREFIX}${prefixId}`;
  const plainTextToken = `${keyPrefix}.${secret}`;
  const tokenHash = hashApiKeyToken(plainTextToken);

  return {
    plainTextToken,
    keyPrefix,
    tokenHash,
  };
}

