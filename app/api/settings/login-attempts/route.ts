import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { requirePermission } from "@/lib/serverAuth";
import { LoginAttemptModel } from "@/models/LoginAttempt.model";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authResult = await requirePermission(
      "canManageSettings",
      "Only Admins can inspect workspace login attempts."
    );
    if ("error" in authResult) {
      return authResult.error;
    }

    await dbconnect();
    const attempts = await LoginAttemptModel.find({
      workspaceId: authResult.actor.workspaceId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(
      { success: true, data: attempts },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      "Failed to fetch login attempt logs.",
      "Login attempts GET error:"
    );
  }
}

