import { NextResponse } from "next/server";
import { normalizeUserRole, UserRole } from "@/lib/rbac";

export const SESSION_COOKIE_NAME = "av_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string;
  ws: string;
  role: UserRole;
  exp: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function getHmacKey(): Promise<CryptoKey> {
  const rawSecret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    (process.env.MONGODB_URI ? `assetsvista:${process.env.MONGODB_URI}` : "assetsvista-dev-session-key");

  // Hash secret to normalized 256-bit key material consistently across Edge & Node runtimes
  const keyMaterial = await crypto.subtle.digest("SHA-256", textEncoder.encode(rawSecret));
  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSessionToken(input: {
  userId: string;
  workspaceId: string;
  role: UserRole;
  maxAgeSeconds?: number;
}): Promise<string> {
  const payload: SessionPayload = {
    sub: input.userId,
    ws: input.workspaceId,
    role: normalizeUserRole(input.role),
    exp: Math.floor(Date.now() / 1000) + (input.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS),
  };

  const payloadB64 = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const sigBytes = fromBase64Url(sigB64);
  const payloadBytes = fromBase64Url(payloadB64);
  if (!sigBytes || !payloadBytes) return null;

  try {
    const key = await getHmacKey();
    const signatureBuffer = new Uint8Array(sigBytes).buffer;
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      textEncoder.encode(payloadB64)
    );
    if (!valid) return null;

    const parsed = JSON.parse(textDecoder.decode(payloadBytes)) as Partial<SessionPayload>;
    if (!parsed.sub || !parsed.exp || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;

    return {
      sub: String(parsed.sub),
      ws: String(parsed.ws || parsed.sub),
      role: normalizeUserRole(parsed.role),
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function applySessionCookie(
  res: NextResponse,
  token: string,
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS
): void {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

