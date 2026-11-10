import { NextResponse } from "next/server";
import { parseReadableError } from "@/lib/errorMessages";

/**
 * Builds a consistent NextResponse JSON error with human-readable message and proper HTTP status code.
 */
export function apiErrorResponse(
  error: unknown,
  fallbackMessage = "An unexpected error occurred.",
  logContext?: string
): NextResponse {
  if (logContext) {
    console.error(logContext, error);
  } else {
    console.error(error);
  }

  const parsed = parseReadableError(error, fallbackMessage);
  return NextResponse.json(
    {
      success: false,
      message: parsed.message,
      ...(parsed.hint ? { hint: parsed.hint } : {}),
    },
    { status: parsed.status }
  );
}

