import { normalizeUserRole, type UserRole } from "@/lib/rbac";

/**
 * Returns true only when Next.js is running in development mode.
 * Production builds (`next build` / `next start`) always return false.
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Parses optional comma-separated developer allowlist emails from env:
 * `DEV_TOOLS_EMAILS` or `DEV_TOOLS_EMAIL`.
 */
export function getConfiguredDevEmails(): string[] {
  const raw = process.env.DEV_TOOLS_EMAILS || process.env.DEV_TOOLS_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Server-side authorization gate for developer-only seed and full-reset tools.
 * Requires `NODE_ENV === "development"`, an active Admin role, and (if configured)
 * a matching developer email in `DEV_TOOLS_EMAIL` / `DEV_TOOLS_EMAILS`.
 */
export function canActorAccessDevTools(
  actor?: {
    role?: UserRole | string;
    dbUser?: { email?: string; isActive?: boolean };
  } | null
): boolean {
  if (!isDevelopmentEnvironment()) return false;
  if (!actor || !actor.dbUser || actor.dbUser.isActive === false) return false;
  if (normalizeUserRole(actor.role) !== "admin") return false;

  const allowedEmails = getConfiguredDevEmails();
  if (allowedEmails.length > 0) {
    const email = (actor.dbUser.email || "").trim().toLowerCase();
    return Boolean(email && allowedEmails.includes(email));
  }

  return true;
}

