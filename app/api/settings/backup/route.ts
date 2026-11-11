import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { requirePermission } from "@/lib/serverAuth";
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
import { SettingsModel } from "@/models/Settings.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authResult = await requirePermission(
      "canManageSettings",
      "Only Admins can download workspace backups."
    );
    if ("error" in authResult) {
      return authResult.error;
    }

    const { actor } = authResult;
    const scope = { userId: actor.workspaceId };
    await dbconnect();

    const [
      settings,
      assets,
      licenses,
      accessories,
      consumables,
      components,
      people,
      maintenances,
      requests,
      acceptances,
      categories,
      statuses,
      locations,
      departments,
      companies,
      manufacturers,
      suppliers,
      assetModels,
      actionLogs,
    ] = await Promise.all([
      SettingsModel.findOne(scope).lean(),
      AssetModel.find(scope).lean(),
      LicenseModel.find(scope).lean(),
      AccessoriesModel.find(scope).lean(),
      ConsumableModel.find(scope).lean(),
      ComponentModel.find(scope).lean(),
      PeopleModel.find(scope).lean(),
      MaintenanceModel.find(scope).lean(),
      CheckoutRequestModel.find(scope).lean(),
      CheckoutAcceptanceModel.find(scope).lean(),
      CategoryModel.find(scope).lean(),
      StatusModel.find(scope).lean(),
      LocationModel.find(scope).lean(),
      DepartmentModel.find(scope).lean(),
      CompanyModel.find(scope).lean(),
      ManufacturerModel.find(scope).lean(),
      SupplierModel.find(scope).lean(),
      AssetModel_Model.find(scope).lean(),
      ActionLogModel.find(scope).sort({ createdAt: -1 }).limit(500).lean(),
    ]);

    const backupPayload = {
      exportedAt: new Date().toISOString(),
      app: "AssetsVista",
      version: "0.1.0",
      workspaceId: actor.workspaceId,
      exportedBy: actor.dbUser.email,
      data: {
        settings,
        assets,
        licenses,
        accessories,
        consumables,
        components,
        people,
        maintenances,
        requests,
        acceptances,
        taxonomies: {
          categories,
          statuses,
          locations,
          departments,
          companies,
          manufacturers,
          suppliers,
          assetModels,
        },
        actionLogs,
      },
    };

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="assetsvista-backup-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to generate backup archive.", "Backup export error:");
  }
}

