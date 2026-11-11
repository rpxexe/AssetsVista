import { apiErrorResponse } from "@/lib/apiError";
import dbconnect from "@/lib/dbconnect";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AccessoriesModel } from "@/models/Accessories.model";
import { AssetModel } from "@/models/Assets.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { NextResponse } from "next/server";

function toMap(rows: Array<{ _id: any; count: number }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (r._id) m.set(r._id.toString(), Number(r.count || 0));
  }
  return m;
}

export async function GET() {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const scope = { userId: workspaceId };

    const [
      locations,
      categories,
      locAssetsAgg,
      locAssignedAgg,
      locAccAgg,
      locConAgg,
      locCompAgg,
      locPeopleAgg,
      catModelsWithCount,
      assetsByModelAgg,
      catLicAgg,
      catAccAgg,
      catConAgg,
      catCompAgg,
    ] = await Promise.all([
      LocationModel.find(scope).select("name image city state").sort({ name: 1 }).lean(),
      CategoryModel.find(scope).select("name type").sort({ name: 1 }).lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, location: { $ne: null } } },
        { $group: { _id: "$location", count: { $sum: 1 } } },
      ]),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, assigned_type: "Location", assigned_to: { $ne: null } } },
        { $group: { _id: "$assigned_to", count: { $sum: 1 } } },
      ]),
      AccessoriesModel.aggregate([
        { $match: { userId: workspaceId, location: { $ne: null } } },
        { $group: { _id: "$location", count: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
      ConsumableModel.aggregate([
        { $match: { userId: workspaceId, location: { $ne: null } } },
        { $group: { _id: "$location", count: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
      ComponentModel.aggregate([
        { $match: { userId: workspaceId, location: { $ne: null } } },
        { $group: { _id: "$location", count: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
      PeopleModel.aggregate([
        { $match: { userId: workspaceId, location: { $ne: null } } },
        { $group: { _id: "$location", count: { $sum: 1 } } },
      ]),
      AssetModel_Model.find(scope).select("_id category").lean<Array<{ _id: any; category?: any }>>(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, asset_model: { $ne: null } } },
        { $group: { _id: "$asset_model", count: { $sum: 1 } } },
      ]),
      LicenseModel.aggregate([
        { $match: { userId: workspaceId, category: { $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      AccessoriesModel.aggregate([
        { $match: { userId: workspaceId, category: { $ne: null } } },
        { $group: { _id: "$category", count: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
      ConsumableModel.aggregate([
        { $match: { userId: workspaceId, category: { $ne: null } } },
        { $group: { _id: "$category", count: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
      ComponentModel.aggregate([
        { $match: { userId: workspaceId, category: { $ne: null } } },
        { $group: { _id: "$category", count: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
    ]);

    const locAssets = toMap(locAssetsAgg);
    const locAssigned = toMap(locAssignedAgg);
    const locAcc = toMap(locAccAgg);
    const locCon = toMap(locConAgg);
    const locComp = toMap(locCompAgg);
    const locPeople = toMap(locPeopleAgg);

    // Roll up Asset counts per AssetModel into Category
    const assetsPerModel = toMap(assetsByModelAgg);
    const catAssets = new Map<string, number>();
    for (const m of catModelsWithCount) {
      const catId = m.category?.toString();
      if (!catId) continue;
      const count = assetsPerModel.get(m._id.toString()) || 0;
      catAssets.set(catId, (catAssets.get(catId) || 0) + count);
    }

    const catLic = toMap(catLicAgg);
    const catAcc = toMap(catAccAgg);
    const catCon = toMap(catConAgg);
    const catComp = toMap(catCompAgg);

    const locationRows = locations.map((loc: any) => {
      const id = loc._id.toString();
      return {
        _id: id,
        name: loc.name,
        image: loc.image,
        assets_count: locAssets.get(id) || 0,
        assigned_assets_count: locAssigned.get(id) || 0,
        accessories_count: locAcc.get(id) || 0,
        consumables_count: locCon.get(id) || 0,
        components_count: locComp.get(id) || 0,
        people_count: locPeople.get(id) || 0,
      };
    });

    const categoryRows = categories.map((cat: any) => {
      const id = cat._id.toString();
      return {
        _id: id,
        name: cat.name,
        type: cat.type,
        assets_count: catAssets.get(id) || 0,
        licenses_count: catLic.get(id) || 0,
        accessories_count: catAcc.get(id) || 0,
        consumables_count: catCon.get(id) || 0,
        components_count: catComp.get(id) || 0,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          locations: locationRows,
          categories: categoryRows,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error fetching dashboard summaries.", "Dashboard summary error:");
  }
}

