import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { canAssignRole, USER_ROLES, UserRole } from "@/lib/rbac";
import { getAuthenticatedActor } from "@/lib/serverAuth";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { ensureCleanUserIndexes, isLegacyUserIndexError } from "@/lib/userIndexes";
import { ActionLogModel } from "@/models/ActionLog.model";
import { PeopleModel } from "@/models/Peoples.model";
import UserModel from "@/models/Users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ROLES = new Set<string>(USER_ROLES);

export async function GET(req: NextRequest) {
  await dbconnect();
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");

    const workspaceMatch: Record<string, unknown> = {
      $or: [
        { workspaceId: actor.workspaceId },
        { clerkId: actor.workspaceId, workspaceId: { $exists: false } },
      ],
    };

    const filter: Record<string, unknown> = { ...workspaceMatch };
    if (roleFilter && ALLOWED_ROLES.has(roleFilter)) {
      filter.role = roleFilter;
    }

    const [users, roleAgg] = await Promise.all([
      UserModel.find(filter)
        .select("-__v")
        .populate("personId", "name username email employee_num department location")
        .sort({ lastLogin: -1 })
        .lean(),
      UserModel.aggregate([
        { $match: workspaceMatch },
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
            suspended: {
              $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const summary = {
      total: 0,
      superadmin: 0,
      admin: 0,
      manager: 0,
      user: 0,
      suspended: 0,
    };

    for (const row of roleAgg) {
      const r = row._id as UserRole;
      if (r in summary) {
        (summary as Record<string, number>)[r] = row.count;
      }
      summary.total += row.count;
      summary.suspended += row.suspended || 0;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Users fetched successfully",
        data: users,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error fetching user accounts.", "Error fetching users:");
  }
}

export async function POST(req: NextRequest) {
  await dbconnect();
  try {
    const actor = await getAuthenticatedActor();
    if (!actor || !actor.dbUser.isActive || !actor.permissions.canManageRoles) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Admin or Super Admin role required to provision users.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const cleanEmail = body.email?.trim().toLowerCase();
    const requestedRole = (body.role || "user") as UserRole;

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(requestedRole)) {
      return NextResponse.json(
        { success: false, message: "Invalid role specified" },
        { status: 400 }
      );
    }

    if (!canAssignRole(actor.role, requestedRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only Super Admins can assign the Super Admin role.",
        },
        { status: 403 }
      );
    }

    const existing = await UserModel.findOne({ email: cleanEmail }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const firstName = body.first_name?.trim() || "";
    const lastName = body.last_name?.trim() || "";
    const emailPrefix = cleanEmail.split("@")[0];
    const fullName =
      body.name?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      emailPrefix;

    let person = await PeopleModel.findOne({
      userId: actor.workspaceId,
      email: cleanEmail,
    });
    if (!person) {
      const baseUsername = (body.username?.trim() || emailPrefix).toLowerCase();
      const usernameTaken = await PeopleModel.findOne({
        userId: actor.workspaceId,
        username: baseUsername,
      })
        .select("_id")
        .lean();
      const uniqueUsername = usernameTaken
        ? `${baseUsername}.${Math.floor(100 + Math.random() * 900)}`
        : baseUsername;

      person = await PeopleModel.create({
        userId: actor.workspaceId,
        name: fullName,
        first_name: firstName || fullName.split(" ")[0],
        last_name: lastName || fullName.split(" ").slice(1).join(" "),
        username: uniqueUsername,
        email: cleanEmail,
        title: body.title?.trim() || undefined,
      });
      invalidateElasticIndexCache(actor.workspaceId);
    }

    await ensureCleanUserIndexes();

    const createProvisionedUser = () =>
      UserModel.create({
        email: cleanEmail,
        name: fullName,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        username: person.username,
        role: requestedRole,
        workspaceId: actor.workspaceId,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        personId: person._id,
        emailVerified: false,
      });

    let newUser;
    try {
      newUser = await createProvisionedUser();
    } catch (userErr) {
      if (isLegacyUserIndexError(userErr)) {
        await ensureCleanUserIndexes(true);
        newUser = await createProvisionedUser();
      } else {
        throw userErr;
      }
    }

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: newUser._id,
      item_type: "User",
      item_name: `${fullName} (${cleanEmail})`,
      action_type: "create",
      admin_name: actor.dbUser.name || actor.dbUser.email,
      notes: `Pre-provisioned user with role '${requestedRole}'`,
    }).catch(() => null);

    return NextResponse.json(
      {
        success: true,
        message: "User provisioned successfully",
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Unable to create user account.", "Error provisioning user:");
  }
}

export async function PATCH(req: NextRequest) {
  await dbconnect();
  try {
    const actor = await getAuthenticatedActor();
    if (!actor || !actor.dbUser.isActive || !actor.permissions.canManageRoles) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Admin or Super Admin privileges required to manage roles.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, role, isActive } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const targetUser = await UserModel.findOne({
      _id: id,
      $or: [
        { workspaceId: actor.workspaceId },
        { clerkId: actor.workspaceId, workspaceId: { $exists: false } },
      ],
    }).lean();
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const updateFields: Record<string, unknown> = {};
    const auditNotes: string[] = [];

    if (role !== undefined) {
      if (!ALLOWED_ROLES.has(role)) {
        return NextResponse.json(
          { success: false, message: "Invalid role specified" },
          { status: 400 }
        );
      }
      // Prevent admin from elevating to superadmin or modifying an existing superadmin
      if (
        !canAssignRole(actor.role, role as UserRole) ||
        (targetUser.role === "superadmin" && actor.role !== "superadmin")
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Only Super Admins can assign or modify Super Admin accounts.",
          },
          { status: 403 }
        );
      }

      // Guard: Do not allow demoting the last active superadmin in workspace
      if (targetUser.role === "superadmin" && role !== "superadmin") {
        const superadminCount = await UserModel.countDocuments({
          workspaceId: actor.workspaceId,
          role: "superadmin",
          isActive: { $ne: false },
        });
        if (superadminCount <= 1) {
          return NextResponse.json(
            {
              success: false,
              message: "Cannot demote the last active Super Admin.",
            },
            { status: 400 }
          );
        }
      }

      updateFields.role = role;
      auditNotes.push(`Role changed from '${targetUser.role}' to '${role}'`);
    }

    if (isActive !== undefined) {
      if (targetUser.role === "superadmin" && actor.role !== "superadmin") {
        return NextResponse.json(
          {
            success: false,
            message: "Only Super Admins can suspend/activate Super Admin accounts.",
          },
          { status: 403 }
        );
      }

      if (isActive === false) {
        if (targetUser._id.toString() === actor.dbUser._id) {
          return NextResponse.json(
            { success: false, message: "You cannot suspend your own active account." },
            { status: 400 }
          );
        }

        if (targetUser.role === "superadmin") {
          const superadminCount = await UserModel.countDocuments({
            workspaceId: actor.workspaceId,
            role: "superadmin",
            isActive: { $ne: false },
          });
          if (superadminCount <= 1) {
            return NextResponse.json(
              {
                success: false,
                message: "Cannot suspend the last active Super Admin.",
              },
              { status: 400 }
            );
          }
        }
      }

      updateFields.isActive = Boolean(isActive);
      auditNotes.push(`Account ${isActive ? "activated" : "suspended"}`);
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    const updated = await UserModel.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    )
      .select("-__v")
      .populate("personId", "name username email employee_num department location")
      .lean();

    if (auditNotes.length > 0 && updated) {
      await ActionLogModel.create({
        userId: actor.workspaceId,
        item_id: updated._id,
        item_type: "User",
        item_name: updated.name || updated.email,
        action_type: "update",
        admin_name: actor.dbUser.name || actor.dbUser.email,
        notes: auditNotes.join("; "),
      }).catch(() => null);
    }

    return NextResponse.json(
      {
        success: true,
        message: "User updated successfully",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error updating user account.", "Error updating user:");
  }
}

export async function DELETE(req: NextRequest) {
  await dbconnect();
  try {
    const actor = await getAuthenticatedActor();
    if (!actor || !actor.dbUser.isActive || !actor.permissions.canManageRoles) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    if (id === actor.dbUser._id) {
      return NextResponse.json(
        { success: false, message: "Cannot delete your own user account." },
        { status: 400 }
      );
    }

    const target = await UserModel.findOne({
      _id: id,
      $or: [
        { workspaceId: actor.workspaceId },
        { clerkId: actor.workspaceId, workspaceId: { $exists: false } },
      ],
    }).lean();
    if (!target) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (target.role === "superadmin" && actor.role !== "superadmin") {
      return NextResponse.json(
        { success: false, message: "Only Super Admins can delete Super Admin accounts." },
        { status: 403 }
      );
    }

    if (target.role === "superadmin") {
      const superadminCount = await UserModel.countDocuments({
        workspaceId: actor.workspaceId,
        role: "superadmin",
        isActive: { $ne: false },
      });
      if (superadminCount <= 1) {
        return NextResponse.json(
          { success: false, message: "Cannot delete the last active Super Admin." },
          { status: 400 }
        );
      }
    }

    await UserModel.findByIdAndDelete(id);

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: target._id,
      item_type: "User",
      item_name: target.name || target.email,
      action_type: "delete",
      admin_name: actor.dbUser.name || actor.dbUser.email,
      notes: `User access account (${target.email}) deleted`,
    }).catch(() => null);

    return NextResponse.json(
      { success: true, message: "User access account deleted" },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error deleting user account.", "Error deleting user:");
  }
}
