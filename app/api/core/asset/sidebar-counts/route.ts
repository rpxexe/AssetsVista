import dbconnect from "@/lib/dbconnect";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { StatusModel } from "@/models/setting/Status.model";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const scope = { userId: workspaceId };
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      total,
      checkedOut,
      dueAudit,
      dueCheckin,
      pastEol,
      deleted,
      statuses,
      statusAgg,
    ] = await Promise.all([
      AssetModel.countDocuments(scope),
      AssetModel.countDocuments({ ...scope, assigned_to: { $ne: null } }),
      AssetModel.countDocuments({
        ...scope,
        $or: [
          { next_audit_date: { $lt: todayStart } },
          { next_audit_date: null, last_audit_date: null },
        ],
      }),
      AssetModel.countDocuments({
        ...scope,
        assigned_to: { $ne: null },
        expected_checkin_date: { $lt: todayStart },
      }),
      AssetModel.countDocuments({ ...scope, eol_date: { $lt: todayStart } }),
      AssetModel.countDocuments({ ...scope, deletedAt: { $ne: null } }),
      StatusModel.find(scope).select("_id name").lean<Array<{ _id: any; name: string }>>(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, status: { $ne: null } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const aggById = new Map<string, number>();
    for (const row of statusAgg) {
      if (row._id) aggById.set(String(row._id), Number(row.count || 0));
    }

    const statusCounts: Record<string, number> = {
      checkedout: checkedOut,
    };
    for (const st of statuses) {
      statusCounts[st.name.trim().toLowerCase()] = aggById.get(String(st._id)) || 0;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          total,
          checkedOut,
          dueAudit,
          dueCheckin,
          pastEol,
          deleted,
          statusCounts,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Asset sidebar counts error:", error);
    return NextResponse.json(
      { success: false, message: "Error loading sidebar asset counts" },
      { status: 500 }
    );
  }
}

