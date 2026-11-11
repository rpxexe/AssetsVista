import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { PeopleModel } from "@/models/Peoples.model";
import { StatusModel } from "@/models/setting/Status.model";
import { LocationModel } from "@/models/setting/Locations.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveAssigneeDisplay(assigned: any, assignedType?: string | null): string {
  if (!assigned) return "";
  if (assignedType === "Asset") {
    return assigned.asset_tag || assigned.asset_name || "Parent Asset";
  }
  if (assigned.first_name || assigned.last_name) {
    return `${assigned.first_name || ""} ${assigned.last_name || ""}`.trim();
  }
  return assigned.name || assigned.username || "Assignee";
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePermission(
      "canCheckoutCheckin",
      "Only Admin or Assets User roles can perform Quick Scan Checkin."
    );
    if ("error" in authResult) {
      return authResult.error;
    }
    const workspaceId = authResult.actor.workspaceId;
    const adminName = authResult.actor.dbUser.name || authResult.actor.dbUser.email;

    await dbconnect();
    void [PeopleModel, LocationModel];

    const body = await req.json();
    const rawIdentifier = String(body.identifier || "").trim();
    const statusName = String(body.statusName || body.status || "Ready to Deploy").trim();
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!rawIdentifier) {
      return NextResponse.json(
        { success: false, message: "Please scan or enter an Asset Tag or Serial Number." },
        { status: 400 }
      );
    }

    const exactRegex = new RegExp(`^${escapeRegex(rawIdentifier)}$`, "i");
    const orQuery: Array<Record<string, unknown>> = [
      { asset_tag: exactRegex },
      { serial_number: exactRegex },
    ];
    if (mongoose.Types.ObjectId.isValid(rawIdentifier)) {
      orQuery.push({ _id: rawIdentifier });
    }

    const asset = await AssetModel.findOne({
      userId: workspaceId,
      $or: orQuery,
    }).populate([
      { path: "status", select: "name" },
      { path: "assigned_to", select: "name first_name last_name username asset_tag asset_name" },
    ]);

    if (!asset) {
      return NextResponse.json(
        { success: false, message: `No active asset found matching '${rawIdentifier}'.` },
        { status: 404 }
      );
    }

    const previousAssignee = asset.assigned_to
      ? resolveAssigneeDisplay(asset.assigned_to, asset.assigned_type)
      : null;

    const targetStatusDoc =
      (await StatusModel.findOne({
        userId: workspaceId,
        name: new RegExp(`^${escapeRegex(statusName)}$`, "i"),
      })
        .select("_id name")
        .lean<{ _id: mongoose.Types.ObjectId; name: string } | null>()) ||
      (await StatusModel.findOne({
        userId: workspaceId,
        name: { $in: ["Ready to Deploy", "Available"] },
      })
        .select("_id name")
        .lean<{ _id: mongoose.Types.ObjectId; name: string } | null>());

    const wasAssigned = Boolean(asset.assigned_to);
    const prevTargetId = asset.assigned_to ? (asset.assigned_to as any)._id || asset.assigned_to : undefined;
    const prevTargetType = asset.assigned_type || undefined;

    asset.assigned_to = null as any;
    asset.assigned_type = null;
    asset.checkout_date = null as any;
    asset.expected_checkin_date = null as any;
    if (targetStatusDoc?._id) {
      asset.status = targetStatusDoc._id;
    }
    if (notes) {
      asset.notes = notes;
    }
    await asset.save();

    await Promise.all([
      CheckoutAcceptanceModel.updateMany(
        { userId: workspaceId, checkoutable_id: asset._id, status: "pending" },
        { $set: { status: "declined", declined_at: new Date(), note: "Asset checked in via Quick Scan" } }
      ).catch(() => null),
      ActionLogModel.create({
        userId: workspaceId,
        item_id: asset._id,
        item_type: "Asset",
        item_name: asset.asset_name || asset.asset_tag,
        action_type: "checkin",
        target_id: prevTargetId,
        target_type: prevTargetType,
        target_name: previousAssignee || undefined,
        admin_name: adminName,
        notes: notes || (wasAssigned ? "Quick Scan Checkin" : "Quick Scan status reset / check-in"),
      }).catch(() => null),
    ]);

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: wasAssigned
          ? `Checked in #${asset.asset_tag} from ${previousAssignee}`
          : `#${asset.asset_tag} was already unassigned — status updated to ${targetStatusDoc?.name || statusName}`,
        data: {
          _id: asset._id,
          asset_tag: asset.asset_tag,
          asset_name: asset.asset_name,
          serial_number: asset.serial_number,
          wasAssigned,
          previousAssignee,
          newStatus: targetStatusDoc?.name || (asset.status as any)?.name || statusName,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Quick scan check-in failed.", "Scan checkin POST error:");
  }
}

