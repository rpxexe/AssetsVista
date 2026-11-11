import { apiErrorResponse } from "@/lib/apiError";
import dbconnect from "@/lib/dbconnect";
import { getAuthenticatedActor } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { CheckoutRequestModel } from "@/models/CheckoutRequest.model";
import { PeopleModel } from "@/models/Peoples.model";
import { StatusModel } from "@/models/setting/Status.model";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();

    let personId = actor.dbUser.personId;
    if (!personId) {
      const person = await PeopleModel.findOne({
        userId: actor.workspaceId,
        email: actor.dbUser.email,
      })
        .select("_id")
        .lean<{ _id?: unknown } | null>();
      if (person?._id) {
        personId = String(person._id);
      }
    }

    const requesterOr: Record<string, unknown>[] = [{ requester_email: actor.dbUser.email }];
    if (personId) {
      requesterOr.unshift({ requester: personId });
    }

    const requestableStatusDocs = await StatusModel.find({
      userId: actor.workspaceId,
      name: /requestable/i,
    })
      .select("_id")
      .lean();
    const requestableStatusIds = requestableStatusDocs.map((s) => s._id);

    const [
      assignedAssets,
      requestableCount,
      recentRequests,
      pendingRequestsCount,
      totalRequestsCount,
      pendingAcceptances,
    ] = await Promise.all([
      personId
        ? AssetModel.find({
            userId: actor.workspaceId,
            assigned_to: personId,
          })
            .populate("status", "name type")
            .populate("asset_model", "name")
            .select("asset_name asset_tag serial_number status asset_model checkout_date expected_checkin_date")
            .sort({ checkout_date: -1 })
            .limit(8)
            .lean()
        : Promise.resolve([]),
      requestableStatusIds.length > 0
        ? AssetModel.countDocuments({
            userId: actor.workspaceId,
            status: { $in: requestableStatusIds },
          })
        : Promise.resolve(0),
      CheckoutRequestModel.find({
        userId: actor.workspaceId,
        $or: requesterOr,
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      CheckoutRequestModel.countDocuments({
        userId: actor.workspaceId,
        $or: requesterOr,
        status: "pending",
      }),
      CheckoutRequestModel.countDocuments({
        userId: actor.workspaceId,
        $or: requesterOr,
      }),
      personId
        ? CheckoutAcceptanceModel.find({
            userId: actor.workspaceId,
            assigned_to: personId,
            status: "pending",
          })
            .sort({ createdAt: -1 })
            .limit(6)
            .lean()
        : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          personId: personId || null,
          counts: {
            assignedAssets: assignedAssets.length,
            requestableAssets: requestableCount,
            pendingRequests: pendingRequestsCount,
            totalRequests: totalRequestsCount,
            pendingAcceptances: pendingAcceptances.length,
          },
          assignedAssets,
          recentRequests,
          pendingAcceptances,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      "Failed to load requester dashboard.",
      "Requester dashboard error:"
    );
  }
}

