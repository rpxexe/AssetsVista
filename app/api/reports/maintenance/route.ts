import dbconnect from "@/lib/dbconnect";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import { NextResponse } from "next/server";

export async function GET() {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const now = new Date();

    // Execute all 3 independent queries in parallel
    const [dueForAudit, overdueCheckins, recentAuditLogs] = await Promise.all([
      AssetModel.find({
        userId: workspaceId,
        $or: [
          { next_audit_date: { $lte: now } },
          { last_audit_date: null },
        ],
      })
        .select("asset_tag asset_name asset_model location status assigned_to last_audit_date next_audit_date")
        .populate([
          { path: "asset_model", select: "name" },
          { path: "location", select: "name" },
          { path: "status", select: "name" },
          { path: "assigned_to", select: "name first_name last_name email" },
        ])
        .sort({ next_audit_date: 1 })
        .lean(),
      AssetModel.find({
        userId: workspaceId,
        expected_checkin_date: { $lt: now },
        assigned_to: { $ne: null },
      })
        .select("asset_tag asset_name asset_model location status assigned_to checkout_date expected_checkin_date")
        .populate([
          { path: "asset_model", select: "name" },
          { path: "location", select: "name" },
          { path: "status", select: "name" },
          { path: "assigned_to", select: "name first_name last_name email" },
        ])
        .sort({ expected_checkin_date: 1 })
        .lean(),
      ActionLogModel.find({ userId: workspaceId, action_type: "audit" })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("user", "name username email")
        .lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Maintenance & audit report fetched successfully",
        data: {
          due_for_audit: dueForAudit,
          overdue_checkins: overdueCheckins,
          recent_audits: recentAuditLogs,
          summary: {
            due_for_audit_count: dueForAudit.length,
            overdue_checkin_count: overdueCheckins.length,
            total_audits_logged: recentAuditLogs.length,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Maintenance report error:", error);
    return NextResponse.json(
      { success: false, message: "Error generating maintenance report" },
      { status: 500 }
    );
  }
}

