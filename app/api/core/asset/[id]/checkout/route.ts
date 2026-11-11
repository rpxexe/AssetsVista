import dbconnect from "@/lib/dbconnect";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { PeopleModel } from "@/models/Peoples.model";
import { StatusModel } from "@/models/setting/Status.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbconnect();

  const authResult = await requirePermission(
    "canCheckoutCheckin",
    "Only Admin or Assets User roles can checkout assets."
  );
  if ("error" in authResult) {
    return authResult.error;
  }
  const workspaceId = authResult.actor.workspaceId;

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
      assigned_to,
      target_type,
      assigned_type,
      target_name,
      checkout_date,
      expected_checkin_date,
      status_id,
      status_name,
      status,
      notes,
      admin_name = "Admin",
      require_acceptance = true,
    } = body;

    const resolvedTargetId = target_id || assigned_to;
    const resolvedTargetType = (target_type || assigned_type || "People") as
      | "People"
      | "Location"
      | "Asset";
    const resolvedStatusParam = status_name || status;

    if (!resolvedTargetId || !mongoose.Types.ObjectId.isValid(resolvedTargetId)) {
      return NextResponse.json(
        { success: false, message: "Valid target ID (user/location/asset) is required for checkout" },
        { status: 400 }
      );
    }

    // Fetch asset, target status, and optional person name concurrently
    const [asset, resolvedStatus, personDoc] = await Promise.all([
      AssetModel.findOne({ _id: id, userId: workspaceId }),
      status_id && mongoose.Types.ObjectId.isValid(status_id)
        ? Promise.resolve(null)
        : resolvedStatusParam
        ? StatusModel.findOne({ userId: workspaceId, name: resolvedStatusParam }).select("_id").lean()
        : StatusModel.findOne({ userId: workspaceId, name: { $in: ["CheckedOut", "Deployed"] } }).select("_id").lean(),
      resolvedTargetType === "People"
        ? PeopleModel.findOne({ _id: resolvedTargetId, userId: workspaceId })
            .select("name first_name last_name")
            .lean<{ name?: string; first_name?: string; last_name?: string } | null>()
        : Promise.resolve(null),
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

    asset.assigned_to = new mongoose.Types.ObjectId(resolvedTargetId);
    asset.assigned_type = resolvedTargetType;
    asset.checkout_date = checkout_date ? new Date(checkout_date) : new Date();
    asset.expected_checkin_date = expected_checkin_date
      ? new Date(expected_checkin_date)
      : undefined;
    asset.status = newStatusId;
    if (notes) asset.notes = notes;

    await asset.save();

    const resolvedTargetName =
      target_name ||
      (personDoc
        ? personDoc.name ||
          [personDoc.first_name, personDoc.last_name].filter(Boolean).join(" ")
        : undefined);

    // Execute audit log creation, pending EULA acceptance, and populated response concurrently
    const [, , populatedAsset] = await Promise.all([
      ActionLogModel.create({
        userId: workspaceId,
        item_id: asset._id,
        item_type: "Asset",
        item_name: asset.asset_name || asset.asset_tag,
        action_type: "checkout",
        target_id: asset.assigned_to,
        target_type: asset.assigned_type,
        target_name: resolvedTargetName || undefined,
        admin_name,
        notes: notes || "Asset checked out",
      }),
      resolvedTargetType === "People" && require_acceptance
        ? CheckoutAcceptanceModel.create({
            userId: workspaceId,
            checkoutable_type: "Asset",
            checkoutable_id: asset._id,
            item_name: asset.asset_name || asset.asset_tag,
            item_tag: asset.asset_tag,
            assigned_to: asset.assigned_to,
            assigned_name: resolvedTargetName,
            status: "pending",
            created_by: admin_name,
          })
        : Promise.resolve(null),
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

    invalidateElasticIndexCache(workspaceId);

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
