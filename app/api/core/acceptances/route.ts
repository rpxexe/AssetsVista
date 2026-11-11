import { apiErrorResponse } from "@/lib/apiError";
import dbconnect from "@/lib/dbconnect";
import { getAuthenticatedActor, getWorkspaceUserId } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { StatusModel } from "@/models/setting/Status.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

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
    if (["pending", "accepted", "declined"].includes(status)) {
      filter.status = status;
    }

    const acceptances = await CheckoutAcceptanceModel.find(filter)
      .populate("assigned_to", "name first_name last_name email username")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Acceptances fetched successfully",
        data: acceptances,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error fetching checkout acceptances.", "Acceptances GET error:");
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
    const { id, action, signature, note } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid acceptance ID" },
        { status: 400 }
      );
    }
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json(
        { success: false, message: "Action must be accept or decline" },
        { status: 400 }
      );
    }

    const acceptance = await CheckoutAcceptanceModel.findOne({
      _id: id,
      userId: actor.workspaceId,
    });
    if (!acceptance) {
      return NextResponse.json(
        { success: false, message: "Acceptance record not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    if (action === "accept") {
      acceptance.status = "accepted";
      acceptance.accepted_at = now;
      acceptance.declined_at = null;
    } else {
      acceptance.status = "declined";
      acceptance.declined_at = now;
      acceptance.accepted_at = null;

      // If declined on an Asset, check it back into Ready to Deploy automatically
      if (acceptance.checkoutable_type === "Asset") {
        const rtdStatus = await StatusModel.findOne({
          userId: actor.workspaceId,
          name: { $in: ["Ready to Deploy", "Available"] },
        })
          .select("_id")
          .lean();

        await AssetModel.updateOne(
          { _id: acceptance.checkoutable_id, userId: actor.workspaceId },
          {
            $set: {
              assigned_to: null,
              assigned_type: null,
              checkout_date: null,
              expected_checkin_date: null,
              ...(rtdStatus?._id ? { status: rtdStatus._id } : {}),
            },
          }
        );
      }
    }

    if (signature) acceptance.signature = String(signature).trim();
    if (note) acceptance.note = String(note).trim();
    await acceptance.save();

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: acceptance.checkoutable_id,
      item_type: acceptance.checkoutable_type,
      item_name: acceptance.item_tag
        ? `#${acceptance.item_tag} - ${acceptance.item_name}`
        : acceptance.item_name,
      action_type: action === "accept" ? "accepted" : "declined",
      target_id: acceptance.assigned_to,
      target_type: "People",
      target_name: acceptance.assigned_name,
      admin_name: actor.dbUser.name || actor.dbUser.email,
      notes:
        note ||
        `${action === "accept" ? "Accepted" : "Declined"}${signature ? ` (Signed: ${signature})` : ""}`,
    }).catch(() => null);

    return NextResponse.json(
      {
        success: true,
        message:
          action === "accept"
            ? "Checkout acceptance recorded."
            : "Checkout declined and assignment cleared.",
        data: acceptance,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error updating checkout acceptance.", "Acceptance PATCH error:");
  }
}

