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
    const body = await req.json();
    const {
      target_id,
      target_type = "People",
      target_name,
      checkout_date,
      expected_checkin_date,
      status_id,
      status_name,
      notes,
      admin_name = "Admin",
    } = body;

    if (!target_id || !mongoose.Types.ObjectId.isValid(target_id)) {
      return NextResponse.json(
        { success: false, message: "Valid target ID (user/location/asset) is required for checkout" },
        { status: 400 }
      );
    }

    // Fetch asset and target status concurrently
    const [asset, resolvedStatus] = await Promise.all([
      AssetModel.findOne({ _id: id, userId: workspaceId }),
      status_id && mongoose.Types.ObjectId.isValid(status_id)
        ? Promise.resolve(null)
        : status_name
        ? StatusModel.findOne({ userId: workspaceId, name: status_name }).select("_id").lean()
        : StatusModel.findOne({ userId: workspaceId, name: { $in: ["CheckedOut", "Deployed"] } }).select("_id").lean(),
    ]);

    if (!asset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    if (asset.assigned_to) {
      return NextResponse.json(
        {
          success: false,
          message: "Asset is already checked out. Please check it in before checking out again.",
        },
        { status: 409 }
      );
    }

    let newStatusId: mongoose.Types.ObjectId = asset.status;
    if (status_id && mongoose.Types.ObjectId.isValid(status_id)) {
      newStatusId = new mongoose.Types.ObjectId(status_id);
    } else if (resolvedStatus?._id) {
      newStatusId = resolvedStatus._id as mongoose.Types.ObjectId;
    }

    asset.assigned_to = new mongoose.Types.ObjectId(target_id);
    asset.assigned_type = target_type;
    asset.checkout_date = checkout_date ? new Date(checkout_date) : new Date();
    asset.expected_checkin_date = expected_checkin_date
      ? new Date(expected_checkin_date)
      : undefined;
    asset.status = newStatusId;
    if (notes) asset.notes = notes;

    await asset.save();

    // Execute audit log creation and populated response fetch concurrently
    const [, populatedAsset] = await Promise.all([
      ActionLogModel.create({
        userId: workspaceId,
        item_id: asset._id,
        item_type: "Asset",
        item_name: asset.asset_name || asset.asset_tag,
        action_type: "checkout",
        target_id: asset.assigned_to,
        target_type: asset.assigned_type,
        target_name: target_name || undefined,
        admin_name,
        notes: notes || "Asset checked out",
      }),
      AssetModel.findOne({ _id: id, userId: workspaceId })
        .populate([
          { path: "company", select: "name" },
          { path: "asset_model", select: "name" },
          { path: "status", select: "name type" },
          { path: "location", select: "name" },
          { path: "assigned_to", select: "name email first_name last_name username" },
        ])
        .lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Asset checked out successfully",
        data: populatedAsset,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error during asset checkout:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error during asset checkout",
      },
      { status: 500 }
    );
  }
}
