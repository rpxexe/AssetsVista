import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken } from "@/lib/apiKeyFormat";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_PAGE_PREFIXES = ["/login", "/sign-in", "/sign-up"];
const PUBLIC_API_PREFIXES = ["/api/auth/"];

function isPublicRequest(pathname: string): boolean {
  if (pathname === "/") return true;
  if (PUBLIC_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicRequest(pathname)) {
    return NextResponse.next();
  }

  const rawToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(rawToken);
  const isApiRoute = pathname.startsWith("/api/") || pathname === "/api";

  if (!session) {
    if (isApiRoute) {
      // Allow plausible AssetsVista Personal Access Tokens through to route handlers
      // where Node crypto + MongoDB perform authoritative hash, expiry & RBAC verification.
      const bearerToken = extractBearerToken(req.headers.get("authorization"));
      if (bearerToken) {
        return NextResponse.next();
      }
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const requestedTarget = `${pathname}${search}`;
    if (requestedTarget && requestedTarget !== "/") {
      loginUrl.searchParams.set("redirect_url", requestedTarget);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets unless referenced in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always protect API routes
    "/(api|trpc)(.*)",
  ],
};
