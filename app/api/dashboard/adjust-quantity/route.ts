import { apiErrorResponse } from "@/lib/apiError";
import dbconnect from "@/lib/dbconnect";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getAuthenticatedActor } from "@/lib/serverAuth";
import { AccessoriesModel } from "@/models/Accessories.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const MODEL_BY_TYPE: Record<
  string,
  { model: mongoose.Model<any>; logType: "Accessory" | "Component" | "Consumable" }
> = {
  accessory: { model: AccessoriesModel, logType: "Accessory" },
  component: { model: ComponentModel, logType: "Component" },
  consumable: { model: ConsumableModel, logType: "Consumable" },
};

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
    const { id, type, qty, delta } = body;

    const entry = MODEL_BY_TYPE[String(type || "").toLowerCase()];
    if (!entry) {
      return NextResponse.json(
        { success: false, message: "Unsupported item type for quantity adjustment" },
        { status: 400 }
      );
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid item ID" },
        { status: 400 }
      );
    }

    const doc = await entry.model.findOne({ _id: id, userId: actor.workspaceId });
    if (!doc) {
      return NextResponse.json(
        { success: false, message: `${entry.logType} not found` },
        { status: 404 }
      );
    }

    const currentQty = Number(doc.qty ?? 0);
    const nextQty =
      delta !== undefined
        ? Math.max(0, currentQty + Number(delta))
        : Math.max(0, Number(qty ?? currentQty));

    doc.qty = nextQty;
    await doc.save();

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: doc._id,
      item_type: entry.logType,
      item_name: doc.name,
      action_type: "update",
      admin_name: actor.dbUser.name || actor.dbUser.email,
      notes: `Adjusted quantity from ${currentQty} to ${nextQty}`,
    }).catch(() => null);

    invalidateElasticIndexCache(actor.workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: `Updated ${doc.name} quantity to ${nextQty}.`,
        data: doc,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Unable to adjust item quantity.", "Adjust quantity error:");
  }
}

