import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { fetchEnrichedPeople } from "@/lib/peopleDirectory";
import { requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { ApiKeyModel } from "@/models/ApiKey.model";
import { AssetModel } from "@/models/Assets.model";
import { PeopleModel } from "@/models/Peoples.model";
import UserModel from "@/models/Users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await dbconnect();
  try {
    const authResult = await requirePermission(
      "canViewPeople",
      "Only Admin or Assets User roles can browse the People Directory."
    );
    if ("error" in authResult) {
      return authResult.error;
    }
    const { actor } = authResult;
    const workspaceId = actor.workspaceId;

    const { searchParams } = new URL(req.url);
    const deletedOnly = searchParams.get("deleted") === "1";

    if (deletedOnly && !actor.permissions.canManagePeople) {
      return NextResponse.json(
        { success: false, message: "Only Admins can view Deleted Users Trash." },
        { status: 403 }
      );
    }

    const search = searchParams.get("search");
    const filter = searchParams.get("filter") || "all";
    const endDateWithin = Number(searchParams.get("end_date_within") || 0);
    const withAssignments = searchParams.get("with_assignments") === "1";
    const includeClearedPast = searchParams.get("include_cleared") === "1";

    const data = await fetchEnrichedPeople({
      workspaceId,
      search,
      deletedOnly,
      filter,
      endDateWithin,
      withAssignments,
      includeClearedPast,
    });

    return NextResponse.json(
      {
        success: true,
        message: "People fetched successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching people:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching people" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await dbconnect();
  try {
    const authResult = await requirePermission(
      "canManagePeople",
      "Only Admins can add people to the directory."
    );
    if ("error" in authResult) {
      return authResult.error;
    }
    const workspaceId = authResult.actor.workspaceId;

    const body = await req.json();

    const firstName = body.first_name?.trim() || "";
    const lastName = body.last_name?.trim() || "";
    const name = body.name?.trim() || [firstName, lastName].filter(Boolean).join(" ") || "New User";

    const baseUser = body.username?.trim()
      ? body.username.trim()
      : body.email
      ? body.email.split("@")[0].toLowerCase()
      : [firstName, lastName].filter(Boolean).join(".").toLowerCase() || `user_${Date.now()}`;

    // Ensure unique username within workspace (including soft-deleted rows in Trash)
    let username = baseUser;
    const existing = await PeopleModel.findOne(
      { userId: workspaceId, username },
      null,
      { includeDeleted: true }
    );
    if (existing) {
      username = `${baseUser}.${Math.floor(100 + Math.random() * 900)}`;
    }

    const person = new PeopleModel({
      userId: workspaceId,
      name,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      title: body.title || body.job_title,
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      username,
      start_date: body.start_date ? new Date(body.start_date) : undefined,
      end_date: body.end_date ? new Date(body.end_date) : undefined,
      department:
        body.department && mongoose.Types.ObjectId.isValid(body.department)
          ? body.department
          : undefined,
      location:
        body.location && mongoose.Types.ObjectId.isValid(body.location)
          ? body.location
          : undefined,
      company:
        body.company && mongoose.Types.ObjectId.isValid(body.company)
          ? body.company
          : undefined,
      employee_num: body.employee_num?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      image: body.image?.trim() || undefined,
    });

    await person.save();
    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Person created successfully",
        data: person,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error creating person profile.", "Error creating person:");
  }
}

export async function PATCH(req: NextRequest) {
  await dbconnect();
  const authResult = await requirePermission(
    "canManagePeople",
    "Only Admins can restore deleted people records."
  );
  if ("error" in authResult) {
    return authResult.error;
  }
  const { actor } = authResult;
  const workspaceId = actor.workspaceId;
  const adminName = actor.dbUser.name || actor.dbUser.email;

  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    const action = String(body.action || "").trim().toLowerCase();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Valid Person ID is required." },
        { status: 400 }
      );
    }

    if (action !== "restore") {
      return NextResponse.json(
        { success: false, message: "Unsupported action." },
        { status: 400 }
      );
    }

    const restored = await PeopleModel.findOneAndUpdate(
      { _id: id, userId: workspaceId, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, deletedBy: null } },
      { new: true, includeDeleted: true }
    );

    if (!restored) {
      return NextResponse.json(
        { success: false, message: "Deleted person record not found." },
        { status: 404 }
      );
    }

    await ActionLogModel.create({
      userId: workspaceId,
      item_id: restored._id,
      item_type: "People",
      item_name: restored.name || restored.username,
      action_type: "update",
      admin_id: actor.userId,
      admin_name: adminName,
      notes: "Person restored from Deleted Users Trash",
    }).catch(() => null);

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: `${restored.name || restored.username} restored to People Directory.`,
        data: restored,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error restoring person profile.", "Error restoring person:");
  }
}

export async function DELETE(req: NextRequest) {
  await dbconnect();
  const authResult = await requirePermission(
    "canManagePeople",
    "Only Admins can delete people from the directory."
  );
  if ("error" in authResult) {
    return authResult.error;
  }
  const { actor } = authResult;
  const workspaceId = actor.workspaceId;
  const adminName = actor.dbUser.name || actor.dbUser.email;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const permanent = searchParams.get("permanent") === "true" || searchParams.get("permanent") === "1";

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing Person ID" },
      { status: 400 }
    );
  }

  try {
    // Prevent deleting a person who currently holds assigned assets
    const assignedCount = await AssetModel.countDocuments({
      userId: workspaceId,
      assigned_to: id,
    });
    if (assignedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete person who currently has ${assignedCount} assigned asset(s). Check in assets or run Complete Offboarding first.`,
        },
        { status: 400 }
      );
    }

    if (permanent) {
      const purged = await PeopleModel.findOneAndDelete(
        { _id: id, userId: workspaceId },
        { includeDeleted: true }
      );
      if (!purged) {
        return NextResponse.json(
          { success: false, message: "Person not found" },
          { status: 404 }
        );
      }

      await ActionLogModel.create({
        userId: workspaceId,
        item_id: purged._id,
        item_type: "People",
        item_name: purged.name || purged.username,
        action_type: "delete",
        admin_id: actor.userId,
        admin_name: adminName,
        notes: "Person permanently purged from Deleted Users Trash",
      }).catch(() => null);

      invalidateElasticIndexCache(workspaceId);
      return NextResponse.json(
        { success: true, message: "Person permanently deleted", data: purged },
        { status: 200 }
      );
    }

    // Prevent self-deletion of linked current admin account
    if (actor.dbUser.personId && actor.dbUser.personId === id) {
      return NextResponse.json(
        { success: false, message: "You cannot delete your own active directory profile." },
        { status: 400 }
      );
    }

    const softDeleted = await PeopleModel.findOneAndUpdate(
      { _id: id, userId: workspaceId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy: adminName } },
      { new: true }
    );

    if (!softDeleted) {
      return NextResponse.json(
        { success: false, message: "Person not found" },
        { status: 404 }
      );
    }

    // Security enhancement over Snipe-IT: soft-deleting a person automatically
    // disables linked login accounts and revokes active Personal Access Tokens.
    const linkedUsers = await UserModel.find({
      $or: [
        { personId: softDeleted._id, workspaceId },
        ...(softDeleted.email
          ? [{ email: softDeleted.email.trim().toLowerCase(), workspaceId }]
          : []),
      ],
    })
      .select("_id")
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>();

    const linkedUserIds = linkedUsers
      .map((u) => u._id)
      .filter((uid) => String(uid) !== actor.userId);

    if (linkedUserIds.length > 0) {
      await Promise.all([
        UserModel.updateMany(
          { _id: { $in: linkedUserIds } },
          { $set: { isActive: false } }
        ),
        ApiKeyModel.updateMany(
          { userId: { $in: linkedUserIds }, workspaceId, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        ),
      ]);
    }

    await ActionLogModel.create({
      userId: workspaceId,
      item_id: softDeleted._id,
      item_type: "People",
      item_name: softDeleted.name || softDeleted.username,
      action_type: "delete",
      admin_id: actor.userId,
      admin_name: adminName,
      notes: "Moved person to Deleted Users Trash (login & API keys suspended)",
    }).catch(() => null);

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Person moved to Deleted Users Trash",
        data: softDeleted,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error deleting person profile.", "Error deleting person:");
  }
}
