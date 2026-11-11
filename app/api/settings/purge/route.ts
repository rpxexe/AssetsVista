import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { canActorAccessDevTools } from "@/lib/devTools";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { requirePermission } from "@/lib/serverAuth";
import { AccessoriesModel } from "@/models/Accessories.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { CheckoutRequestModel } from "@/models/CheckoutRequest.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { LoginAttemptModel } from "@/models/LoginAttempt.model";
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
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePermission(
      "canManageSettings",
      "Only Admins can purge workspace records."
    );
    if ("error" in authResult) {
      return authResult.error;
    }

    const { actor } = authResult;
    const body = await req.json();
    const mode = String(body.mode || "").trim();

    await dbconnect();
    const scope = { userId: actor.workspaceId };

    if (mode === "purge_canceled_requests") {
      const [reqRes, accRes] = await Promise.all([
        CheckoutRequestModel.deleteMany({ ...scope, status: "canceled" }),
        CheckoutAcceptanceModel.deleteMany({ ...scope, status: "declined" }),
      ]);
      const removed = (reqRes.deletedCount || 0) + (accRes.deletedCount || 0);
      return NextResponse.json(
        {
          success: true,
          message: `Purged ${removed} canceled/declined record(s).`,
        },
        { status: 200 }
      );
    }

    if (mode === "purge_logs") {
      const [actionRes, loginRes] = await Promise.all([
        ActionLogModel.deleteMany(scope),
        LoginAttemptModel.deleteMany({ workspaceId: actor.workspaceId }),
      ]);
      const removed = (actionRes.deletedCount || 0) + (loginRes.deletedCount || 0);
      return NextResponse.json(
        {
          success: true,
          message: `Cleared ${removed} activity and login audit record(s).`,
        },
        { status: 200 }
      );
    }

    if (mode === "reset_inventory") {
      await Promise.all([
        AssetModel.deleteMany(scope),
        LicenseModel.deleteMany(scope),
        AccessoriesModel.deleteMany(scope),
        ConsumableModel.deleteMany(scope),
        ComponentModel.deleteMany(scope),
        MaintenanceModel.deleteMany(scope),
        CheckoutRequestModel.deleteMany(scope),
        CheckoutAcceptanceModel.deleteMany(scope),
        ActionLogModel.deleteMany(scope),
      ]);
      invalidateElasticIndexCache(actor.workspaceId);

      return NextResponse.json(
        {
          success: true,
          message:
            "Workspace inventory records cleared. Users, roles, and configuration settings were preserved.",
        },
        { status: 200 }
      );
    }

    if (mode === "reset_all_dev") {
      if (!canActorAccessDevTools(actor)) {
        return NextResponse.json(
          {
            success: false,
            message: "Full workspace reset is allowed only in development mode for authorized developers.",
          },
          { status: 403 }
        );
      }

      await Promise.all([
        AssetModel.deleteMany(scope),
        LicenseModel.deleteMany(scope),
        AccessoriesModel.deleteMany(scope),
        ConsumableModel.deleteMany(scope),
        ComponentModel.deleteMany(scope),
        MaintenanceModel.deleteMany(scope),
        CheckoutRequestModel.deleteMany(scope),
        CheckoutAcceptanceModel.deleteMany(scope),
        ActionLogModel.deleteMany(scope),
        LoginAttemptModel.deleteMany({ workspaceId: actor.workspaceId }),
        PeopleModel.deleteMany(scope),
        AssetModel_Model.deleteMany(scope),
        CategoryModel.deleteMany(scope),
        CompanyModel.deleteMany(scope),
        DepartmentModel.deleteMany(scope),
        LocationModel.deleteMany(scope),
        ManufacturerModel.deleteMany(scope),
        StatusModel.deleteMany(scope),
        SupplierModel.deleteMany(scope),
      ]);
      invalidateElasticIndexCache(actor.workspaceId);

      return NextResponse.json(
        {
          success: true,
          message:
            "Full workspace data (inventory, people, taxonomies & logs) cleared. Login accounts and workspace settings were preserved.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Unsupported purge action requested." },
      { status: 400 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to purge workspace records.", "Purge error:");
  }
}

