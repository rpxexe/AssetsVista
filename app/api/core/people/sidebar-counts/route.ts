import dbconnect from "@/lib/dbconnect";
import { computePeopleSidebarCounts } from "@/lib/peopleDirectory";
import { requirePermission } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authResult = await requirePermission(
      "canViewPeople",
      "Only Admin or Assets User roles can view People directory counts."
    );
    if ("error" in authResult) {
      return authResult.error;
    }

    await dbconnect();
    const counts = await computePeopleSidebarCounts(authResult.actor.workspaceId);

    return NextResponse.json(
      {
        success: true,
        data: counts,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("People sidebar counts error:", error);
    return NextResponse.json(
      { success: false, message: "Error loading people sidebar counts" },
      { status: 500 }
    );
  }
}

