import { apiErrorResponse } from "@/lib/apiError";
import { seedWorkspaceDemoData } from "@/lib/demoData";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Please sign in to load demo data into your workspace." },
        { status: 401 }
      );
    }

    const summary = await seedWorkspaceDemoData(workspaceId);

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

