import dbconnect from "@/lib/dbconnect";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { StatusModel } from "@/models/setting/Status.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbconnect();

  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset ID" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      status_id,
      status_name,
      notes,
      admin_name = "Admin",
    } = body;

    const [asset, resolvedStatus] = await Promise.all([
      AssetModel.findOne({ _id: id, userId: workspaceId }),
      status_id && mongoose.Types.ObjectId.isValid(status_id)
        ? Promise.resolve(null)
        : status_name
        ? StatusModel.findOne({ userId: workspaceId, name: status_name }).select("_id").lean()
        : StatusModel.findOne({ userId: workspaceId, name: { $in: ["Ready to Deploy", "Available"] } }).select("_id").lean(),
    ]);

    if (!asset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    if (!asset.assigned_to) {
      return NextResponse.json(
        {
          success: false,
          message: "Asset is not currently checked out.",
        },
        { status: 400 }
      );
    }

    const previousTarget = asset.assigned_to;
    const previousTargetType = asset.assigned_type;

    let newStatusId: mongoose.Types.ObjectId = asset.status;
    if (status_id && mongoose.Types.ObjectId.isValid(status_id)) {
      newStatusId = new mongoose.Types.ObjectId(status_id);
    } else if (resolvedStatus?._id) {
      newStatusId = resolvedStatus._id as mongoose.Types.ObjectId;
    }

    // Clear checkout fields
    asset.assigned_to = undefined;
    asset.assigned_type = null;
    asset.checkout_date = undefined;
    asset.expected_checkin_date = undefined;
    asset.status = newStatusId;
    if (notes) asset.notes = notes;

    await asset.save();

    // Log checkin and fetch populated asset concurrently
    const [, populatedAsset] = await Promise.all([
      ActionLogModel.create({
        userId: workspaceId,
        item_id: asset._id,
        item_type: "Asset",
        item_name: asset.asset_name || asset.asset_tag,
        action_type: "checkin",
        target_id: previousTarget,
        target_type: previousTargetType,
        admin_name,
        notes: notes || "Asset checked in",
      }),
      AssetModel.findOne({ _id: id, userId: workspaceId })
        .populate([
          { path: "company", select: "name" },
          { path: "asset_model", select: "name" },
          { path: "status", select: "name type" },
          { path: "location", select: "name" },
        ])
        .lean(),
    ]);

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Asset checked in successfully",
        data: populatedAsset,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error during asset checkin:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error during asset checkin",
      },
      { status: 500 }
    );
  }
}
