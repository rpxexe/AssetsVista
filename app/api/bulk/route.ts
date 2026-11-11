import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { canAssignRole, normalizeUserRole, USER_ROLES } from "@/lib/rbac";
import { getAuthenticatedActor } from "@/lib/serverAuth";
import { AccessoriesModel } from "@/models/Accessories.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { CheckoutRequestModel } from "@/models/CheckoutRequest.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { MaintenanceModel } from "@/models/Maintenance.model";
import { PeopleModel } from "@/models/Peoples.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import UserModel from "@/models/Users.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const SIMPLE_DELETE_MODELS: Record<
  string,
  { model: mongoose.Model<any>; perm: "canDeleteAssets" | "canManageSettings"; label: string }
> = {
  license: { model: LicenseModel, perm: "canDeleteAssets", label: "license(s)" },
  accessory: { model: AccessoriesModel, perm: "canDeleteAssets", label: "accessory item(s)" },
  consumable: { model: ConsumableModel, perm: "canDeleteAssets", label: "consumable(s)" },
  component: { model: ComponentModel, perm: "canDeleteAssets", label: "component(s)" },
  status: { model: StatusModel, perm: "canManageSettings", label: "status label(s)" },
  assetmodel: { model: AssetModel_Model, perm: "canManageSettings", label: "asset model(s)" },
  category: { model: CategoryModel, perm: "canManageSettings", label: "category item(s)" },
  company: { model: CompanyModel, perm: "canManageSettings", label: "company record(s)" },
  department: { model: DepartmentModel, perm: "canManageSettings", label: "department(s)" },
  location: { model: LocationModel, perm: "canManageSettings", label: "location(s)" },
  manufacturer: { model: ManufacturerModel, perm: "canManageSettings", label: "manufacturer(s)" },
  supplier: { model: SupplierModel, perm: "canManageSettings", label: "supplier(s)" },
  actionlog: { model: ActionLogModel, perm: "canManageSettings", label: "activity log(s)" },
};

function deny(message = "Forbidden: Insufficient permissions for this bulk action.") {
  return NextResponse.json({ success: false, message }, { status: 403 });
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
    if (!actor.dbUser.isActive) {
      return deny("Your account is suspended.");
    }

    const body = await req.json();
    const entity = String(body.entity || "").trim().toLowerCase();
    const action = String(body.action || "").trim().toLowerCase();
    const rawIds: unknown[] = Array.isArray(body.ids) ? body.ids : [];
    const payload = (body.payload || {}) as Record<string, any>;

    const validIds = Array.from(
      new Set(
        rawIds
          .map((x) => String(x || "").trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );

    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please select at least one valid row." },
        { status: 400 }
      );
    }

    await dbconnect();
    const workspaceId = actor.workspaceId;
    const adminName = actor.dbUser.name || actor.dbUser.email;

    // 1. Simple inventory & taxonomy bulk delete
    if (action === "delete" && entity in SIMPLE_DELETE_MODELS) {
      const cfg = SIMPLE_DELETE_MODELS[entity];
      if (!actor.permissions[cfg.perm]) {
        return deny();
      }
      const res = await cfg.model.deleteMany({
        _id: { $in: validIds },
        userId: workspaceId,
      });
      invalidateElasticIndexCache(workspaceId);
      return NextResponse.json({
        success: true,
        message: `Deleted ${res.deletedCount || 0} ${cfg.label}.`,
        count: res.deletedCount || 0,
      });
    }

    // 2. Assets bulk actions
    if (entity === "asset") {
      if (action === "delete") {
        if (!actor.permissions.canDeleteAssets) return deny();
        const res = await AssetModel.deleteMany({
          _id: { $in: validIds },
          userId: workspaceId,
        });
        invalidateElasticIndexCache(workspaceId);
        return NextResponse.json({
          success: true,
          message: `Deleted ${res.deletedCount || 0} asset(s).`,
          count: res.deletedCount || 0,
        });
      }

      if (action === "status") {
        if (!actor.permissions.canCreateEditAssets) return deny();
        const statusId = String(payload.statusId || "").trim();
        if (!statusId || !mongoose.Types.ObjectId.isValid(statusId)) {
          return NextResponse.json(
            { success: false, message: "Please choose a valid status label." },
            { status: 400 }
          );
        }
        const statusDoc = await StatusModel.findOne({ _id: statusId, userId: workspaceId })
          .select("_id name")
          .lean<{ _id: mongoose.Types.ObjectId; name: string } | null>();
        if (!statusDoc) {
          return NextResponse.json(
            { success: false, message: "Selected status label not found." },
            { status: 404 }
          );
        }
        const res = await AssetModel.updateMany(
          { _id: { $in: validIds }, userId: workspaceId },
          { $set: { status: statusDoc._id } }
        );
        invalidateElasticIndexCache(workspaceId);
        return NextResponse.json({
          success: true,
          message: `Updated status to "${statusDoc.name}" on ${res.modifiedCount || 0} asset(s).`,
          count: res.modifiedCount || 0,
        });
      }

      if (action === "checkin") {
        if (!actor.permissions.canCheckoutCheckin) return deny();
        const rtdStatus = await StatusModel.findOne({
          userId: workspaceId,
          name: { $in: ["Ready to Deploy", "Available"] },
        })
          .select("_id")
          .lean<{ _id: mongoose.Types.ObjectId } | null>();

        const res = await AssetModel.updateMany(
          { _id: { $in: validIds }, userId: workspaceId, assigned_to: { $ne: null } },
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
        invalidateElasticIndexCache(workspaceId);
        return NextResponse.json({
          success: true,
          message: `Checked in ${res.modifiedCount || 0} assigned asset(s).`,
          count: res.modifiedCount || 0,
        });
      }

      if (action === "request") {
        if (!actor.permissions.canRequestItems) return deny();
        const assets = await AssetModel.find({
          _id: { $in: validIds },
          userId: workspaceId,
        })
          .select("_id asset_name asset_tag")
          .lean<Array<{ _id: mongoose.Types.ObjectId; asset_name?: string; asset_tag?: string }>>();

        if (assets.length === 0) {
          return NextResponse.json(
            { success: false, message: "No matching assets found to request." },
            { status: 404 }
          );
        }

        const docs = assets.map((a) => ({
          userId: workspaceId,
          requester: actor.dbUser.personId || undefined,
          requester_name: adminName,
          requester_email: actor.dbUser.email,
          item_type: "Asset" as const,
          item_id: a._id,
          item_name: a.asset_name || a.asset_tag || "Asset",
          item_tag: a.asset_tag,
          quantity: 1,
          status: "pending" as const,
          notes: typeof payload.notes === "string" ? payload.notes.trim() || undefined : undefined,
        }));
        await CheckoutRequestModel.insertMany(docs);
        return NextResponse.json({
          success: true,
          message: `Submitted ${docs.length} asset request(s).`,
          count: docs.length,
        });
      }
    }

    // 3. People Directory bulk delete (protects people with active assigned assets)
    if (entity === "people" && action === "delete") {
      if (!actor.permissions.canManagePeople) return deny();

      const busyPersonIdsRaw = await AssetModel.distinct("assigned_to", {
        userId: workspaceId,
        assigned_to: { $in: validIds },
      });
      const busySet = new Set(busyPersonIdsRaw.map((id) => String(id)));
      const deletableIds = validIds.filter((id) => !busySet.has(id));

      if (deletableIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected people currently hold assigned assets and cannot be deleted.",
          },
          { status: 400 }
        );
      }

      const res = await PeopleModel.deleteMany({
        _id: { $in: deletableIds },
        userId: workspaceId,
      });
      invalidateElasticIndexCache(workspaceId);
      const skipped = validIds.length - deletableIds.length;
      return NextResponse.json({
        success: true,
        message:
          skipped > 0
            ? `Deleted ${res.deletedCount || 0} person record(s); skipped ${skipped} with active assignments.`
            : `Deleted ${res.deletedCount || 0} person record(s).`,
        count: res.deletedCount || 0,
      });
    }

    // 4. User Role & Account Access Management
    if (entity === "user") {
      if (!actor.permissions.canManageRoles) return deny();

      const workspaceFilter = {
        _id: { $in: validIds },
        $or: [
          { workspaceId },
          { clerkId: workspaceId, workspaceId: { $exists: false } },
        ],
      };

      if (action === "role") {
        const nextRole = normalizeUserRole(payload.role);
        if (!USER_ROLES.includes(nextRole) || !canAssignRole(actor.role)) {
          return deny("Invalid role or insufficient permissions.");
        }

        const targets = await UserModel.find(workspaceFilter).select("_id role isActive").lean();
        if (nextRole !== "admin") {
          const activeAdminsTotal = await UserModel.countDocuments({
            workspaceId,
            role: { $in: ["admin", "superadmin"] },
            isActive: { $ne: false },
          });
          const demotedAdminsCount = targets.filter(
            (u: any) => normalizeUserRole(u.role) === "admin" && u.isActive !== false
          ).length;
          if (activeAdminsTotal - demotedAdminsCount < 1) {
            return NextResponse.json(
              { success: false, message: "At least one active Admin must remain in workspace." },
              { status: 400 }
            );
          }
        }

        const res = await UserModel.updateMany(workspaceFilter, { $set: { role: nextRole } });
        return NextResponse.json({
          success: true,
          message: `Updated ${res.modifiedCount || 0} account(s) to ${nextRole}.`,
          count: res.modifiedCount || 0,
        });
      }

      if (action === "activate" || action === "suspend") {
        const nextState = action === "activate";
        const safeIds = nextState
          ? validIds
          : validIds.filter((id) => id !== actor.dbUser._id);

        if (!nextState) {
          if (safeIds.length === 0) {
            return NextResponse.json(
              { success: false, message: "You cannot suspend your own account." },
              { status: 400 }
            );
          }
          const targets = await UserModel.find({
            _id: { $in: safeIds },
            $or: [{ workspaceId }, { clerkId: workspaceId, workspaceId: { $exists: false } }],
          })
            .select("_id role isActive")
            .lean();
          const activeAdminsTotal = await UserModel.countDocuments({
            workspaceId,
            role: { $in: ["admin", "superadmin"] },
            isActive: { $ne: false },
          });
          const suspendedAdmins = targets.filter(
            (u: any) => normalizeUserRole(u.role) === "admin" && u.isActive !== false
          ).length;
          if (activeAdminsTotal - suspendedAdmins < 1) {
            return NextResponse.json(
              { success: false, message: "Cannot suspend all active Admin accounts." },
              { status: 400 }
            );
          }
        }

        const res = await UserModel.updateMany(
          {
            _id: { $in: safeIds },
            $or: [{ workspaceId }, { clerkId: workspaceId, workspaceId: { $exists: false } }],
          },
          { $set: { isActive: nextState } }
        );
        return NextResponse.json({
          success: true,
          message: `${nextState ? "Activated" : "Suspended"} ${res.modifiedCount || 0} account(s).`,
          count: res.modifiedCount || 0,
        });
      }

      if (action === "delete") {
        const safeIds = validIds.filter((id) => id !== actor.dbUser._id);
        if (safeIds.length === 0) {
          return NextResponse.json(
            { success: false, message: "You cannot delete your own account." },
            { status: 400 }
          );
        }
        const targets = await UserModel.find({
          _id: { $in: safeIds },
          $or: [{ workspaceId }, { clerkId: workspaceId, workspaceId: { $exists: false } }],
        })
          .select("_id role isActive")
          .lean();
        const activeAdminsTotal = await UserModel.countDocuments({
          workspaceId,
          role: { $in: ["admin", "superadmin"] },
          isActive: { $ne: false },
        });
        const deletedAdmins = targets.filter(
          (u: any) => normalizeUserRole(u.role) === "admin" && u.isActive !== false
        ).length;
        if (activeAdminsTotal - deletedAdmins < 1) {
          return NextResponse.json(
            { success: false, message: "Cannot delete the last active Admin." },
            { status: 400 }
          );
        }

        const res = await UserModel.deleteMany({
          _id: { $in: safeIds },
          $or: [{ workspaceId }, { clerkId: workspaceId, workspaceId: { $exists: false } }],
        });
        return NextResponse.json({
          success: true,
          message: `Deleted ${res.deletedCount || 0} login account(s).`,
          count: res.deletedCount || 0,
        });
      }
    }

    // 5. Maintenances bulk actions
    if (entity === "maintenance") {
      if (action === "complete" || action === "reopen") {
        if (!actor.permissions.canManageMaintenances) return deny();
        const res = await MaintenanceModel.updateMany(
          { _id: { $in: validIds }, userId: workspaceId },
          { $set: { completed_at: action === "complete" ? new Date() : null } }
        );
        return NextResponse.json({
          success: true,
          message: `${action === "complete" ? "Completed" : "Reopened"} ${
            res.modifiedCount || 0
          } maintenance record(s).`,
          count: res.modifiedCount || 0,
        });
      }
      if (action === "delete") {
        if (!actor.permissions.canDeleteAssets) return deny();
        const res = await MaintenanceModel.deleteMany({
          _id: { $in: validIds },
          userId: workspaceId,
        });
        return NextResponse.json({
          success: true,
          message: `Deleted ${res.deletedCount || 0} maintenance record(s).`,
          count: res.deletedCount || 0,
        });
      }
    }

    // 6. Requests bulk actions
    if (entity === "request") {
      if (action === "fulfill") {
        if (!actor.permissions.canFulfillRequests) return deny();
        const res = await CheckoutRequestModel.updateMany(
          { _id: { $in: validIds }, userId: workspaceId, status: "pending" },
          { $set: { status: "fulfilled", fulfilled_at: new Date(), canceled_at: null } }
        );
        return NextResponse.json({
          success: true,
          message: `Fulfilled ${res.modifiedCount || 0} pending request(s).`,
          count: res.modifiedCount || 0,
        });
      }

      if (action === "cancel") {
        const filter: Record<string, any> = {
          _id: { $in: validIds },
          userId: workspaceId,
          status: "pending",
        };
        if (!actor.permissions.canFulfillRequests) {
          const ownOr: Record<string, unknown>[] = [{ requester_email: actor.dbUser.email }];
          if (actor.dbUser.personId) {
            ownOr.unshift({ requester: actor.dbUser.personId });
          }
          filter.$or = ownOr;
        }
        const res = await CheckoutRequestModel.updateMany(filter, {
          $set: { status: "canceled", canceled_at: new Date(), fulfilled_at: null },
        });
        return NextResponse.json({
          success: true,
          message: `Canceled ${res.modifiedCount || 0} pending request(s).`,
          count: res.modifiedCount || 0,
        });
      }

      if (action === "delete") {
        if (!actor.permissions.canDeleteAssets) return deny();
        const res = await CheckoutRequestModel.deleteMany({
          _id: { $in: validIds },
          userId: workspaceId,
        });
        return NextResponse.json({
          success: true,
          message: `Deleted ${res.deletedCount || 0} request(s).`,
          count: res.deletedCount || 0,
        });
      }
    }

    // 7. Acceptances bulk actions
    if (entity === "acceptance" && (action === "accept" || action === "decline")) {
      const filter: Record<string, any> = {
        _id: { $in: validIds },
        userId: workspaceId,
        status: "pending",
      };
      if (!actor.permissions.canCheckoutCheckin) {
        if (!actor.dbUser.personId) return deny();
        filter.assigned_to = actor.dbUser.personId;
      }

      const rows = await CheckoutAcceptanceModel.find(filter);
      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "No eligible pending acceptances selected." },
          { status: 400 }
        );
      }

      const now = new Date();
      if (action === "accept") {
        await CheckoutAcceptanceModel.updateMany(
          { _id: { $in: rows.map((r) => r._id) } },
          {
            $set: {
              status: "accepted",
              accepted_at: now,
              declined_at: null,
              signature: adminName,
            },
          }
        );
      } else {
        await CheckoutAcceptanceModel.updateMany(
          { _id: { $in: rows.map((r) => r._id) } },
          { $set: { status: "declined", declined_at: now, accepted_at: null } }
        );
        const declinedAssetIds = rows
          .filter((r) => r.checkoutable_type === "Asset" && r.checkoutable_id)
          .map((r) => r.checkoutable_id);
        if (declinedAssetIds.length > 0) {
          const rtdStatus = await StatusModel.findOne({
            userId: workspaceId,
            name: { $in: ["Ready to Deploy", "Available"] },
          })
            .select("_id")
            .lean<{ _id: mongoose.Types.ObjectId } | null>();
          await AssetModel.updateMany(
            { _id: { $in: declinedAssetIds }, userId: workspaceId },
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
          invalidateElasticIndexCache(workspaceId);
        }
      }

      return NextResponse.json({
        success: true,
        message: `${action === "accept" ? "Accepted" : "Declined"} ${rows.length} item(s).`,
        count: rows.length,
      });
    }

    return NextResponse.json(
      { success: false, message: `Unsupported bulk operation: ${entity}.${action}` },
      { status: 400 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Bulk operation failed.", "Bulk API error:");
  }
}

