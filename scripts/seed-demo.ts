import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import dbconnect from "@/lib/dbconnect";
import { seedWorkspaceDemoData } from "@/lib/demoData";
import { ensureMultiTenantIndexes } from "@/lib/userIndexes";
import { AccessoriesModel } from "@/models/Accessories.model";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import UserModel from "@/models/Users.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function backfillUnownedDocs(model: mongoose.Model<any>, targetWorkspaceId: string) {
  const unownedFilter = {
    $or: [{ userId: { $exists: false } }, { userId: null }, { userId: "" }],
  };
  const docs = await model.find(unownedFilter).select("_id").lean();
  let migrated = 0;
  for (const doc of docs) {
    try {
      await model.updateOne({ _id: doc._id }, { $set: { userId: targetWorkspaceId } });
      migrated++;
    } catch {
      // Skip individual collisions with existing scoped compound unique indexes
    }
  }
  return migrated;
}

async function main() {
  const rootDir = process.cwd();
  loadEnvFile(path.join(rootDir, ".env.local"));
  loadEnvFile(path.join(rootDir, ".env"));

  await dbconnect();
  await ensureMultiTenantIndexes(true);

  const users = await UserModel.find({}).sort({ createdAt: 1 }).lean<any[]>();
  for (const u of users) {
    const resolvedWs = u.workspaceId || u.clerkId || u._id.toString();
    const isPersonalOwner = !u.workspaceId || (u.clerkId && resolvedWs === u.clerkId);
    if (!u.workspaceId || (isPersonalOwner && u.role !== "superadmin")) {
      await UserModel.updateOne(
        { _id: u._id },
        {
          $set: {
            workspaceId: resolvedWs,
            ...(isPersonalOwner ? { role: "superadmin" } : {}),
          },
        }
      );
      u.workspaceId = resolvedWs;
    }
  }

  const primaryUser = users[0];
  const primaryWorkspaceId =
    primaryUser?.workspaceId ||
    primaryUser?.clerkId ||
    (primaryUser?._id ? primaryUser._id.toString() : "demo-workspace");

  const modelsToBackfill: Array<[string, mongoose.Model<any>]> = [
    ["Companies", CompanyModel],
    ["Locations", LocationModel],
    ["Departments", DepartmentModel],
    ["Categories", CategoryModel],
    ["Statuses", StatusModel],
    ["Manufacturers", ManufacturerModel],
    ["Suppliers", SupplierModel],
    ["AssetModels", AssetModel_Model],
    ["People", PeopleModel],
    ["Assets", AssetModel],
    ["Licenses", LicenseModel],
    ["Accessories", AccessoriesModel],
    ["Components", ComponentModel],
    ["Consumables", ConsumableModel],
    ["ActionLogs", ActionLogModel],
    ["Settings", SettingsModel],
  ];

  const backfillCounts: Record<string, number> = {};
  for (const [label, model] of modelsToBackfill) {
    backfillCounts[label] = await backfillUnownedDocs(model, primaryWorkspaceId);
  }

  const summary = await seedWorkspaceDemoData(primaryWorkspaceId);

  const [
    companiesTotal,
    locationsTotal,
    departmentsTotal,
    categoriesTotal,
    statusesTotal,
    manufacturersTotal,
    suppliersTotal,
    assetModelsTotal,
    peopleTotal,
    assetsTotal,
    licensesTotal,
    accessoriesTotal,
    componentsTotal,
    consumablesTotal,
    actionLogsTotal,
    settingsTotal,
  ] = await Promise.all([
    CompanyModel.countDocuments({ userId: primaryWorkspaceId }),
    LocationModel.countDocuments({ userId: primaryWorkspaceId }),
    DepartmentModel.countDocuments({ userId: primaryWorkspaceId }),
    CategoryModel.countDocuments({ userId: primaryWorkspaceId }),
    StatusModel.countDocuments({ userId: primaryWorkspaceId }),
    ManufacturerModel.countDocuments({ userId: primaryWorkspaceId }),
    SupplierModel.countDocuments({ userId: primaryWorkspaceId }),
    AssetModel_Model.countDocuments({ userId: primaryWorkspaceId }),
    PeopleModel.countDocuments({ userId: primaryWorkspaceId }),
    AssetModel.countDocuments({ userId: primaryWorkspaceId }),
    LicenseModel.countDocuments({ userId: primaryWorkspaceId }),
    AccessoriesModel.countDocuments({ userId: primaryWorkspaceId }),
    ComponentModel.countDocuments({ userId: primaryWorkspaceId }),
    ConsumableModel.countDocuments({ userId: primaryWorkspaceId }),
    ActionLogModel.countDocuments({ userId: primaryWorkspaceId }),
    SettingsModel.countDocuments({ userId: primaryWorkspaceId }),
  ]);

  console.log("Multi-tenant migration & demo seed complete.");
  console.log("Existing user count:", users.length);
  console.log("Backfilled unowned records into primary workspace:", backfillCounts);
  console.log("Demo seed summary:", summary);
  console.log("Primary workspace collection counts:", {
    companies: companiesTotal,
    locations: locationsTotal,
    departments: departmentsTotal,
    categories: categoriesTotal,
    statuses: statusesTotal,
    manufacturers: manufacturersTotal,
    suppliers: suppliersTotal,
    assetModels: assetModelsTotal,
    people: peopleTotal,
    assets: assetsTotal,
    licenses: licensesTotal,
    accessories: accessoriesTotal,
    components: componentsTotal,
    consumables: consumablesTotal,
    actionLogs: actionLogsTotal,
    settings: settingsTotal,
  });

  if (users.length > 1) {
    const secondaryWorkspaceId = users[1].workspaceId || users[1].clerkId || users[1]._id.toString();
    const [secAssets, secPeople, secSettings] = await Promise.all([
      AssetModel.countDocuments({ userId: secondaryWorkspaceId }),
      PeopleModel.countDocuments({ userId: secondaryWorkspaceId }),
      SettingsModel.countDocuments({ userId: secondaryWorkspaceId }),
    ]);
    console.log("Secondary workspace isolation check (expected zeros):", {
      assets: secAssets,
      people: secPeople,
      settings: secSettings,
    });
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed script failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
