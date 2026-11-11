import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { PeopleModel } from "@/models/Peoples.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { StatusModel } from "@/models/setting/Status.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePermission(
      "canCheckoutCheckin",
      "Only Admin or Assets User roles can perform Bulk Checkout."
    );
    if ("error" in authResult) {
      return authResult.error;
    }
    const workspaceId = authResult.actor.workspaceId;
    const adminName = authResult.actor.dbUser.name || authResult.actor.dbUser.email;

    await dbconnect();
    const body = await req.json();

    const rawIds: unknown[] = Array.isArray(body.assetIds) ? body.assetIds : [];
    const assetIds = Array.from(
      new Set(
        rawIds.map((x) => String(x || "").trim()).filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );

    const assignedType = (body.assigned_type || "People") as "People" | "Location" | "Asset";
    const assignedTo = String(body.assigned_to || "").trim();
    const statusName = String(body.statusName || body.status || "Deployed").trim();
    const checkoutDate = body.checkout_date ? new Date(body.checkout_date) : new Date();
    const expectedCheckinDate = body.expected_checkin_date
      ? new Date(body.expected_checkin_date)
      : undefined;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const requireAcceptance = body.require_acceptance !== false;

    if (assetIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please select at least one asset to check out." },
        { status: 400 }
      );
    }

    if (!["People", "Location", "Asset"].includes(assignedType)) {
      return NextResponse.json(
        { success: false, message: "Invalid assignee type." },
        { status: 400 }
      );
    }

    if (!assignedTo || !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return NextResponse.json(
        { success: false, message: "Please choose a valid recipient." },
        { status: 400 }
      );
    }

    let resolvedTargetName = "Assignee";
    if (assignedType === "People") {
      const person = await PeopleModel.findOne({ _id: assignedTo, userId: workspaceId })
        .select("name first_name last_name username")
        .lean<{ name?: string; first_name?: string; last_name?: string; username?: string } | null>();
      if (!person) {
        return NextResponse.json({ success: false, message: "Selected person not found." }, { status: 404 });
      }
      resolvedTargetName =
        person.name ||
        `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
        person.username ||
        "Person";
    } else if (assignedType === "Location") {
      const loc = await LocationModel.findOne({ _id: assignedTo, userId: workspaceId })
        .select("name")
        .lean<{ name: string } | null>();
      if (!loc) {
        return NextResponse.json({ success: false, message: "Selected location not found." }, { status: 404 });
      }
      resolvedTargetName = loc.name;
    } else {
      const targetAsset = await AssetModel.findOne({ _id: assignedTo, userId: workspaceId })
        .select("asset_tag asset_name")
        .lean<{ asset_tag: string; asset_name?: string } | null>();
      if (!targetAsset) {
        return NextResponse.json({ success: false, message: "Target asset not found." }, { status: 404 });
      }
      resolvedTargetName = `${targetAsset.asset_tag}${targetAsset.asset_name ? ` (${targetAsset.asset_name})` : ""}`;
    }

    const [assets, statusDoc] = await Promise.all([
      AssetModel.find({ _id: { $in: assetIds }, userId: workspaceId })
        .select("_id asset_tag asset_name assigned_to")
        .lean<Array<{ _id: mongoose.Types.ObjectId; asset_tag: string; asset_name?: string; assigned_to?: any }>>(),
      StatusModel.findOne({
        userId: workspaceId,
        name: new RegExp(`^${escapeRegex(statusName)}$`, "i"),
      })
        .select("_id name")
        .lean<{ _id: mongoose.Types.ObjectId; name: string } | null>(),
    ]);

    const fallbackStatus =
      statusDoc ||
      (await StatusModel.findOne({
        userId: workspaceId,
        name: { $in: ["Deployed", "CheckedOut"] },
      })
        .select("_id name")
        .lean<{ _id: mongoose.Types.ObjectId; name: string } | null>());

    const eligible = assets.filter(
      (a) => !a.assigned_to && !(assignedType === "Asset" && String(a._id) === assignedTo)
    );
    const skipped = assets
      .filter((a) => Boolean(a.assigned_to) || (assignedType === "Asset" && String(a._id) === assignedTo))
      .map((a) => ({
        _id: String(a._id),
        asset_tag: a.asset_tag,
        reason:
          assignedType === "Asset" && String(a._id) === assignedTo
            ? "Cannot check out asset to itself"
            : "Already checked out",
      }));

    if (eligible.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "None of the selected assets are available to check out.",
          skipped,
        },
        { status: 409 }
      );
    }

    const eligibleIds = eligible.map((a) => a._id);
    await AssetModel.updateMany(
      { _id: { $in: eligibleIds }, userId: workspaceId, assigned_to: null },
      {
        $set: {
          assigned_to: new mongoose.Types.ObjectId(assignedTo),
          assigned_type: assignedType,
          checkout_date: checkoutDate,
          expected_checkin_date: expectedCheckinDate || null,
          ...(fallbackStatus?._id ? { status: fallbackStatus._id } : {}),
          ...(notes ? { notes } : {}),
        },
      }
    );

    const logOps = ActionLogModel.insertMany(
      eligible.map((a) => ({
        userId: workspaceId,
        item_id: a._id,
        item_type: "Asset" as const,
        item_name: a.asset_name || a.asset_tag,
        action_type: "checkout" as const,
        target_id: new mongoose.Types.ObjectId(assignedTo),
        target_type: assignedType,
        target_name: resolvedTargetName,
        admin_name: adminName,
        notes: notes || `Bulk checked out to ${resolvedTargetName}`,
      }))
    ).catch(() => null);

    const acceptanceOps =
      assignedType === "People" && requireAcceptance
        ? CheckoutAcceptanceModel.insertMany(
            eligible.map((a) => ({
              userId: workspaceId,
              checkoutable_type: "Asset" as const,
              checkoutable_id: a._id,
              item_name: a.asset_name || a.asset_tag,
              item_tag: a.asset_tag,
              assigned_to: new mongoose.Types.ObjectId(assignedTo),
              assigned_name: resolvedTargetName,
              status: "pending" as const,
              created_by: adminName,
            }))
          ).catch(() => null)
        : Promise.resolve(null);

    await Promise.all([logOps, acceptanceOps]);
    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: `Checked out ${eligible.length} asset(s) to ${resolvedTargetName}.`,
        data: {
          checkedOutCount: eligible.length,
          targetName: resolvedTargetName,
          checkedOut: eligible.map((a) => ({
            _id: String(a._id),
            asset_tag: a.asset_tag,
            asset_name: a.asset_name,
          })),
          skipped,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Bulk checkout failed.", "Bulk checkout POST error:");
  }
}

