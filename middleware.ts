
import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";
import { NextResponse, NextRequest } from "next/server";
export default withMiddlewareAuthRequired();
export const config = {
  matcher: ["/admin", "/assets/:path*"],
  // "/api/:path*"
};
