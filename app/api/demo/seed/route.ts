import { apiErrorResponse } from "@/lib/apiError";
import { seedWorkspaceDemoData } from "@/lib/demoData";
import { canActorAccessDevTools } from "@/lib/devTools";
import { requirePermission } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const authResult = await requirePermission(
      "canManageSettings",
      "Only Admins can seed workspace demo data."
    );
    if ("error" in authResult) {
      return authResult.error;
    }

    if (!canActorAccessDevTools(authResult.actor)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Demo data seeding is disabled outside development mode or restricted to configured developer accounts.",
        },
        { status: 403 }
      );
    }

    const summary = await seedWorkspaceDemoData(authResult.actor.workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Demo data seeded across all inventory collections for your workspace.",
        data: summary,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      "Unable to populate demo data for your workspace.",
      "Demo seed failed:"
    );
  }
}

