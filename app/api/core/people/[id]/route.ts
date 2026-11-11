import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getAuthenticatedActor, requirePermission } from "@/lib/serverAuth";
import { PeopleModel } from "@/models/Peoples.model";
import { AssetModel } from "@/models/Assets.model";
import { LicenseModel } from "@/models/Licenses.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import { ApiKeyModel } from "@/models/ApiKey.model";
import UserModel from "@/models/Users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbconnect();

  const actor = await getAuthenticatedActor();
  if (!actor) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }
  const workspaceId = actor.workspaceId;

  if (!actor.permissions.canViewPeople && actor.dbUser.personId !== id) {
    return NextResponse.json(
      { success: false, message: "Forbidden: You can only view your own assigned profile." },
      { status: 403 }
    );
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid person ID" },
      { status: 400 }
    );
  }

  try {
    const person = await PeopleModel.findOne({ _id: id, userId: workspaceId })
      .populate([
        { path: "department", select: "name" },
        { path: "location", select: "name" },
        { path: "company", select: "name" },
      ])
      .lean();

    if (!person) {
      return NextResponse.json(
        { success: false, message: "Person not found" },
        { status: 404 }
      );
    }

    // Snipe-IT features: Fetch assigned assets, licenses, and activity logs in parallel
    const licenseQueries: any[] = [];
    if (person.name) licenseQueries.push({ license_to_name: person.name });
    if (person.email) licenseQueries.push({ license_to_email: person.email });

    const [assignedAssets, assignedLicenses, activityLogs, linkedUser] = await Promise.all([
      AssetModel.find({ userId: workspaceId, assigned_to: id })
        .populate([
          { path: "asset_model", select: "name model_no image" },
          { path: "status", select: "name type" },
          { path: "location", select: "name" },
          { path: "company", select: "name" },
        ])
        .sort({ checkout_date: -1 })
        .lean(),
      licenseQueries.length > 0
        ? LicenseModel.find({ userId: workspaceId, $or: licenseQueries })
            .populate([
              { path: "category", select: "name" },
              { path: "manufacturer", select: "name" },
            ])
            .lean()
        : Promise.resolve([]),
      ActionLogModel.find({
        userId: workspaceId,
        $or: [{ target_id: id }, { user: id }],
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("user", "name username email")
        .lean(),
      UserModel.findOne({
        $and: [
          {
            $or: [
              { personId: person._id },
              ...(person.email ? [{ email: person.email.trim().toLowerCase() }] : []),
            ],
          },
          {
            $or: [
              { workspaceId },
              { clerkId: workspaceId, workspaceId: { $exists: false } },
            ],
          },
        ],
      })
        .select("_id role isActive")
        .lean<{ _id: mongoose.Types.ObjectId; role?: string; isActive?: boolean } | null>(),
    ]);

    const activeApiKeysCount = linkedUser?._id
      ? await ApiKeyModel.countDocuments({
          userId: linkedUser._id,
          workspaceId,
          revokedAt: null,
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        })
      : 0;

    // Calculate total purchase value of assigned equipment
    const totalAssetValue = assignedAssets.reduce(
      (sum, a: any) => sum + (Number(a.purchase_cost) || 0),
      0
    );

    return NextResponse.json(
      {
        success: true,
        message: "Person fetched successfully",
        data: {
          ...person,
          assigned_assets: assignedAssets,
          assigned_licenses: assignedLicenses,
          activity_logs: activityLogs,
          assets_count: assignedAssets.length,
          licenses_count: assignedLicenses.length,
          total_asset_value: totalAssetValue,
          user_id: linkedUser?._id ? linkedUser._id.toString() : null,
          role: linkedUser?.role || null,
          isActive: linkedUser ? linkedUser.isActive !== false : null,
          active_api_keys_count: activeApiKeysCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching person:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching person" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbconnect();

  const authResult = await requirePermission(
    "canManagePeople",
    "Only Admins can update people records."
  );
  if ("error" in authResult) {
    return authResult.error;
  }
  const workspaceId = authResult.actor.workspaceId;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid person ID" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    delete body.userId;

    if (body.username) {
      const duplicate = await PeopleModel.findOne({
        userId: workspaceId,
        _id: { $ne: id },
        username: body.username,
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `Username '${body.username}' is already in use` },
          { status: 409 }
        );
      }
    }

    if (!body.name && (body.first_name || body.last_name)) {
      body.name = [body.first_name, body.last_name].filter(Boolean).join(" ");
    }

    const updated = await PeopleModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Person not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { success: true, message: "Person updated successfully", data: updated },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error updating person profile.", "Error updating person:");
  }
}
