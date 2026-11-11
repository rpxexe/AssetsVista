import dbconnect from "@/lib/dbconnect";
import { requirePermission } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbconnect();

  const authResult = await requirePermission(
    "canAuditAssets",
    "Only Admin or Assets User roles can perform physical asset audits."
  );
  if ("error" in authResult) {
    return authResult.error;
  }
  const workspaceId = authResult.actor.workspaceId;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid asset ID" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const asset = await AssetModel.findOne({ _id: id, userId: workspaceId });

    if (!asset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(now.getFullYear() + 1);

    asset.last_audit_date = now;
    asset.next_audit_date = nextYear;
    if (body.location && mongoose.Types.ObjectId.isValid(body.location)) {
      asset.location = body.location;
    }
    await asset.save();

    // Log the audit event
    await ActionLogModel.create({
      userId: workspaceId,
      action_type: "audit",
      item_type: "Asset",
      item_id: asset._id,
      item_name: asset.asset_tag ? `${asset.asset_tag} (${asset.asset_name})` : asset.asset_name,
      target_type: asset.assigned_type || undefined,
      target_id: asset.assigned_to || undefined,
      notes: body.notes || "Physical asset audit verified.",
    });

    return NextResponse.json(
      {
        success: true,
        message: `Asset '${asset.asset_tag}' successfully audited.`,
        data: asset,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Asset audit error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error auditing asset" },
      { status: 500 }
    );
  }
}

