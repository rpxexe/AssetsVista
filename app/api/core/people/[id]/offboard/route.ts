import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { normalizeUserRole } from "@/lib/rbac";
import { requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { ApiKeyModel } from "@/models/ApiKey.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import { StatusModel } from "@/models/setting/Status.model";
import UserModel from "@/models/Users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbconnect();
  try {
    const authResult = await requirePermission(
      "canManagePeople",
      "Only Admins can run automated employee offboarding clearance."
    );
    if ("error" in authResult) {
      return authResult.error;
    }

    const { actor } = authResult;
    const workspaceId = actor.workspaceId;
    const adminName = actor.dbUser.name || actor.dbUser.email;
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid Person ID" },
        { status: 400 }
      );
    }

    let body: {
      checkinAssets?: boolean;
      reclaimLicenses?: boolean;
      disableLogin?: boolean;
      revokeApiKeys?: boolean;
      notes?: string;
    } = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const checkinAssets = body.checkinAssets !== false;
    const reclaimLicenses = body.reclaimLicenses !== false;
    const disableLogin = body.disableLogin !== false;
    const revokeApiKeys = body.revokeApiKeys !== false;
    const resolutionNote = typeof body.notes === "string" ? body.notes.trim() : "";

    const person = await PeopleModel.findOne({ _id: id, userId: workspaceId });
    if (!person) {
      return NextResponse.json(
        { success: false, message: "Person not found" },
        { status: 404 }
      );
    }

    const personName =
      person.name ||
      `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
      person.username;

    // Locate any linked workspace auth user(s)
    const userMatchOr: Record<string, unknown>[] = [{ personId: person._id }];
    if (person.email) {
      userMatchOr.push({ email: person.email.trim().toLowerCase() });
    }
    const linkedUsers = await UserModel.find({
      $and: [
        { $or: userMatchOr },
        {
          $or: [
            { workspaceId },
            { clerkId: workspaceId, workspaceId: { $exists: false } },
          ],
        },
      ],
    })
      .select("_id role isActive email name")
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          role?: string;
          isActive?: boolean;
          email?: string;
          name?: string;
        }>
      >();

    // Safety guard against locking out the current admin or the last active workspace Admin
    if (disableLogin || revokeApiKeys) {
      const touchesSelf = linkedUsers.some((u) => String(u._id) === actor.userId);
      if (touchesSelf) {
        return NextResponse.json(
          {
            success: false,
            message: "You cannot disable or revoke your own active account via offboarding.",
          },
          { status: 400 }
        );
      }

      if (disableLogin) {
        const activeAdminsTotal = await UserModel.countDocuments({
          workspaceId,
          role: { $in: ["admin", "superadmin"] },
          isActive: { $ne: false },
        });
        const activeTargetAdmins = linkedUsers.filter(
          (u) => normalizeUserRole(u.role) === "admin" && u.isActive !== false
        ).length;

        if (activeTargetAdmins > 0 && activeAdminsTotal - activeTargetAdmins < 1) {
          return NextResponse.json(
            {
              success: false,
              message: "Cannot disable login for the last active workspace Admin.",
            },
            { status: 400 }
          );
        }
      }
    }

    const now = new Date();
    let assetsCheckedIn = 0;
    let licensesReclaimed = 0;
    let loginsDisabled = 0;
    let apiKeysRevoked = 0;

    // 1. Atomically check in all assigned assets -> Ready to Deploy
    if (checkinAssets) {
      if (!actor.permissions.canCheckoutCheckin) {
        return NextResponse.json(
          { success: false, message: "Missing Checkout/Checkin permission." },
          { status: 403 }
        );
      }

      const assignedAssets = await AssetModel.find({
        userId: workspaceId,
        assigned_to: person._id,
      })
        .select("_id asset_tag asset_name")
        .lean<Array<{ _id: mongoose.Types.ObjectId; asset_tag?: string; asset_name?: string }>>();

      if (assignedAssets.length > 0) {
        const readyStatus = await StatusModel.findOne({
          userId: workspaceId,
          name: { $regex: /^(ready to deploy|available)$/i },
        })
          .select("_id")
          .lean<{ _id: mongoose.Types.ObjectId } | null>();

        const assetIds = assignedAssets.map((a) => a._id);
        const updateRes = await AssetModel.updateMany(
          { _id: { $in: assetIds }, userId: workspaceId },
          {
            $set: {
              assigned_to: null,
              assigned_type: null,
              checkout_date: null,
              expected_checkin_date: null,
              ...(readyStatus?._id ? { status: readyStatus._id } : {}),
            },
          }
        );
        assetsCheckedIn = updateRes.modifiedCount || assignedAssets.length;

        await CheckoutAcceptanceModel.updateMany(
          {
            userId: workspaceId,
            assigned_to: person._id,
            status: "pending",
          },
          { $set: { status: "declined", declined_at: now } }
        ).catch(() => null);

        await ActionLogModel.insertMany(
          assignedAssets.map((a) => ({
            userId: workspaceId,
            item_id: a._id,
            item_type: "Asset" as const,
            item_name: a.asset_name || a.asset_tag || "Asset",
            action_type: "checkin" as const,
            target_id: person._id,
            target_type: "People" as const,
            target_name: personName,
            admin_id: actor.userId,
            admin_name: adminName,
            notes:
              resolutionNote ||
              `Auto checked-in via Offboarding Clearance for ${personName}`,
          }))
        ).catch(() => null);
      }
    }

    // 2. Reclaim assigned software licenses
    if (reclaimLicenses) {
      const licMatch: Record<string, unknown>[] = [];
      if (person.name) licMatch.push({ license_to_name: person.name });
      if (person.email) licMatch.push({ license_to_email: person.email.trim().toLowerCase() });

      if (licMatch.length > 0) {
        const matchedLicenses = await LicenseModel.find({
          userId: workspaceId,
          $or: licMatch,
        });

        for (const lic of matchedLicenses) {
          lic.license_to_name = "";
          lic.license_to_email = "";
          const totalSeats = Number(lic.seats || 1);
          const currentAvail = Number(lic.seats_available ?? 0);
          if (currentAvail < totalSeats) {
            lic.seats_available = Math.min(totalSeats, currentAvail + 1);
          }
          await lic.save();
          licensesReclaimed += 1;

          await ActionLogModel.create({
            userId: workspaceId,
            item_id: lic._id,
            item_type: "License",
            item_name: lic.name,
            action_type: "checkin",
            target_id: person._id,
            target_type: "People",
            target_name: personName,
            admin_id: actor.userId,
            admin_name: adminName,
            notes:
              resolutionNote ||
              `License reclaimed during Offboarding Clearance for ${personName}`,
          }).catch(() => null);
        }
      }
    }

    const linkedUserIds = linkedUsers.map((u) => u._id);

    // 3. Suspend login access
    if (disableLogin && linkedUserIds.length > 0) {
      const loginRes = await UserModel.updateMany(
        { _id: { $in: linkedUserIds }, isActive: { $ne: false } },
        { $set: { isActive: false } }
      );
      loginsDisabled = loginRes.modifiedCount || 0;
    }

    // 4. Revoke all active Personal Access Tokens immediately
    if (revokeApiKeys && linkedUserIds.length > 0) {
      const keyRes = await ApiKeyModel.updateMany(
        { userId: { $in: linkedUserIds }, workspaceId, revokedAt: null },
        { $set: { revokedAt: now } }
      );
      apiKeysRevoked = keyRes.modifiedCount || 0;
    }

    // Set end_date if absent & append offboarding clearance note
    let changedPerson = false;
    if (!person.end_date) {
      person.end_date = now;
      changedPerson = true;
    }
    const stampNote = `[Offboarded ${now.toISOString().slice(0, 10)} by ${adminName}: ${assetsCheckedIn} asset(s) returned, ${licensesReclaimed} license(s) reclaimed, ${loginsDisabled} login(s) disabled, ${apiKeysRevoked} API key(s) revoked]`;
    if (resolutionNote || assetsCheckedIn || licensesReclaimed || loginsDisabled || apiKeysRevoked) {
      const extra = resolutionNote ? `${stampNote} ${resolutionNote}` : stampNote;
      person.notes = person.notes ? `${person.notes}\n${extra}` : extra;
      changedPerson = true;
    }
    if (changedPerson) {
      await person.save();
    }

    await ActionLogModel.create({
      userId: workspaceId,
      item_id: person._id,
      item_type: "People",
      item_name: personName,
      action_type: "update",
      admin_id: actor.userId,
      admin_name: adminName,
      notes: stampNote,
    }).catch(() => null);

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: `Offboarding completed for ${personName}.`,
        data: {
          assetsCheckedIn,
          licensesReclaimed,
          loginsDisabled,
          apiKeysRevoked,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(
      error,
      "Failed to complete offboarding clearance.",
      "Offboarding error:"
    );
  }
}

