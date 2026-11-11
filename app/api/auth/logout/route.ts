import { clearSessionCookie } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Signed out successfully" },
    { status: 200 }
  );
  clearSessionCookie(response);
  return response;
}

