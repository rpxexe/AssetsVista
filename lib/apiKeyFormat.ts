export const API_KEY_TOKEN_PREFIX = "av_";

export type ApiKeyExpirationPreset =
  | "30d"
  | "90d"
  | "1y"
  | "5y"
  | "20y"
  | "never";

export const API_KEY_EXPIRATION_OPTIONS: {
  value: ApiKeyExpirationPreset;
  label: string;
  description: string;
}[] = [
  {
    value: "30d",
    label: "30 days",
    description: "Short-lived token for temporary automations",
  },
  {
    value: "90d",
    label: "90 days",
    description: "Quarterly rotation policy",
  },
  {
    value: "1y",
    label: "1 year (Recommended)",
    description: "Balanced security for scripts and webhooks",
  },
  {
    value: "5y",
    label: "5 years",
    description: "Long-lived service integration",
  },
  {
    value: "20y",
    label: "20 years (Default)",
    description: "Long-term personal access token matching Snipe-IT",
  },
  {
    value: "never",
    label: "No expiration",
    description: "Valid until manually revoked",
  },
];

const BEARER_HEADER_REGEX = /^Bearer\s+(.+)$/i;
const TOKEN_STRUCTURE_REGEX = /^av_[A-Za-z0-9]{6,16}\.[A-Za-z0-9_-]{24,128}$/;

/**
 * Extracts a plausibly formatted AssetsVista Personal Access Token from an
 * Authorization header (`Bearer av_<prefix>.<secret>`). Returns null otherwise.
 */
export function extractBearerToken(headerValue?: string | null): string | null {
  if (!headerValue) return null;
  const match = BEARER_HEADER_REGEX.exec(headerValue.trim());
  if (!match) return null;
  const token = match[1]?.trim();
  if (!token || !TOKEN_STRUCTURE_REGEX.test(token)) {
    return null;
  }
  return token;
}

/**
 * Computes an expiration Date from an allowed preset, or null for non-expiring keys.
 */
export function computeExpirationDate(
  preset: ApiKeyExpirationPreset,
  fromDate: Date = new Date()
): Date | null {
  const next = new Date(fromDate.getTime());
  switch (preset) {
    case "30d":
      next.setDate(next.getDate() + 30);
      return next;
    case "90d":
      next.setDate(next.getDate() + 90);
      return next;
    case "1y":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    case "5y":
      next.setFullYear(next.getFullYear() + 5);
      return next;
    case "20y":
      next.setFullYear(next.getFullYear() + 20);
      return next;
    case "never":
      return null;
  }
}

