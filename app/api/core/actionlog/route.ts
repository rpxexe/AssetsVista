import dbconnect from "@/lib/dbconnect";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const itemType = searchParams.get("item_type");
    const actionType = searchParams.get("action_type");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    const filter: Record<string, any> = { userId: workspaceId };
    if (itemType) filter.item_type = itemType;
    if (actionType) filter.action_type = actionType;

    const logs = await ActionLogModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Activity logs fetched successfully",
        data: logs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching action logs:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching action logs" },
      { status: 500 }
    );
  }
}

