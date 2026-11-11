import { apiErrorResponse } from "@/lib/apiError";
import dbconnect from "@/lib/dbconnect";
import { getAuthenticatedActor, getWorkspaceUserId } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AccessoriesModel } from "@/models/Accessories.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutRequestModel, RequestableItemType } from "@/models/CheckoutRequest.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

async function resolveRequestedItem(
  workspaceId: string,
  itemType: RequestableItemType,
  itemId: string
): Promise<{ name: string; tag?: string } | null> {
  const scope = { _id: itemId, userId: workspaceId };
  switch (itemType) {
    case "Asset": {
      const a = await AssetModel.findOne(scope)
        .select("asset_name asset_tag")
        .lean<{ asset_name?: string; asset_tag?: string } | null>();
      return a ? { name: a.asset_name || a.asset_tag || "Asset", tag: a.asset_tag } : null;
    }
    case "AssetModel": {
      const m = await AssetModel_Model.findOne(scope)
        .select("name model_no")
        .lean<{ name: string; model_no?: string } | null>();
      return m ? { name: m.name, tag: m.model_no } : null;
    }
    case "Accessory": {
      const x = await AccessoriesModel.findOne(scope).select("name").lean<{ name: string } | null>();
      return x ? { name: x.name } : null;
    }
    case "Consumable": {
      const x = await ConsumableModel.findOne(scope).select("name").lean<{ name: string } | null>();
      return x ? { name: x.name } : null;
    }
    case "Component": {
      const x = await ComponentModel.findOne(scope).select("name").lean<{ name: string } | null>();
      return x ? { name: x.name } : null;
    }
    case "License": {
      const x = await LicenseModel.findOne(scope).select("name").lean<{ name: string } | null>();
      return x ? { name: x.name } : null;
    }
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";

    const filter: Record<string, any> = { userId: workspaceId };
    if (["pending", "fulfilled", "canceled"].includes(status)) {
      filter.status = status;
    }

    const requests = await CheckoutRequestModel.find(filter)
      .populate("requester", "name first_name last_name email employee_num")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Requests fetched successfully",
        data: requests,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error fetching requests.", "Requests GET error:");
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const body = await req.json();
    const itemType = (body.item_type || "Asset") as RequestableItemType;
    const itemId = body.item_id;

    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return NextResponse.json(
        { success: false, message: "Please select a valid item to request" },
        { status: 400 }
      );
    }

    const resolved = await resolveRequestedItem(actor.workspaceId, itemType, itemId);
    if (!resolved) {
      return NextResponse.json(
        { success: false, message: "Requested item not found" },
        { status: 404 }
      );
    }

    let requesterPersonId =
      body.requester && mongoose.Types.ObjectId.isValid(body.requester)
        ? body.requester
        : actor.dbUser.personId;
    let requesterName = actor.dbUser.name || actor.dbUser.email;
    let requesterEmail = actor.dbUser.email;

    if (requesterPersonId) {
      const person = await PeopleModel.findOne({
        _id: requesterPersonId,
        userId: actor.workspaceId,
      })
        .select("name first_name last_name email")
        .lean<{ name?: string; first_name?: string; last_name?: string; email?: string } | null>();

      if (person) {
        requesterName =
          person.name || [person.first_name, person.last_name].filter(Boolean).join(" ") || requesterName;
        requesterEmail = person.email || requesterEmail;
      } else {
        requesterPersonId = undefined;
      }
    }

    const doc = await CheckoutRequestModel.create({
      userId: actor.workspaceId,
      requester: requesterPersonId,
      requester_name: requesterName,
      requester_email: requesterEmail,
      item_type: itemType,
      item_id: itemId,
      item_name: resolved.name,
      item_tag: resolved.tag,
      quantity: Math.max(1, Number(body.quantity) || 1),
      status: "pending",
      notes: body.notes?.trim() || undefined,
    });

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: doc._id,
      item_type: "CheckoutRequest",
      item_name: resolved.tag ? `#${resolved.tag} - ${resolved.name}` : resolved.name,
      action_type: "requested",
      target_id: requesterPersonId,
      target_type: requesterPersonId ? "People" : null,
      target_name: requesterName,
      admin_name: requesterName,
      notes: body.notes?.trim() || `Requested ${doc.quantity} unit(s)`,
    }).catch(() => null);

    return NextResponse.json(
      {
        success: true,
        message: "Checkout request submitted successfully",
        data: doc,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error creating request.", "Requests POST error:");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const body = await req.json();
    const { id, action, notes } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid request ID" },
        { status: 400 }
      );
    }
    if (action !== "fulfill" && action !== "cancel") {
      return NextResponse.json(
        { success: false, message: "Action must be fulfill or cancel" },
        { status: 400 }
      );
    }

    const requestDoc = await CheckoutRequestModel.findOne({
      _id: id,
      userId: actor.workspaceId,
    });
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, message: "Request not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    if (action === "fulfill") {
      requestDoc.status = "fulfilled";
      requestDoc.fulfilled_at = now;
      requestDoc.canceled_at = null;
    } else {
      requestDoc.status = "canceled";
      requestDoc.canceled_at = now;
      requestDoc.fulfilled_at = null;
    }
    if (notes !== undefined) requestDoc.notes = notes;
    await requestDoc.save();

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: requestDoc._id,
      item_type: "CheckoutRequest",
      item_name: requestDoc.item_tag
        ? `#${requestDoc.item_tag} - ${requestDoc.item_name}`
        : requestDoc.item_name,
      action_type: "update",
      target_name: requestDoc.requester_name,
      admin_name: actor.dbUser.name || actor.dbUser.email,
      notes: `Request ${action === "fulfill" ? "fulfilled" : "canceled"}`,
    }).catch(() => null);

    return NextResponse.json(
      {
        success: true,
        message: action === "fulfill" ? "Request marked fulfilled" : "Request canceled",
        data: requestDoc,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error updating request.", "Requests PATCH error:");
  }
}

