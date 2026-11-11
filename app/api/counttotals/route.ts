import dbconnect from "@/lib/dbconnect";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AccessoriesModel } from "@/models/Accessories.model";
import { AssetModel } from "@/models/Assets.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { PeopleModel } from "@/models/Peoples.model";
import { NextResponse } from "next/server";

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
      totalAssets,
      licenseSeatsAgg,
      accessoryQtyAgg,
      consumableQtyAgg,
      componentQtyAgg,
      totalPeople,
    ] = await Promise.all([
      AssetModel.countDocuments(scope),
      LicenseModel.aggregate([
        { $match: scope },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$seats", 1] } } } },
      ]),
      AccessoriesModel.aggregate([
        { $match: scope },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
      ConsumableModel.aggregate([
        { $match: scope },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
      ComponentModel.aggregate([
        { $match: scope },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$qty", 0] } } } },
      ]),
      PeopleModel.countDocuments(scope),
    ]);

    const totalLicenses = Number(licenseSeatsAgg[0]?.total ?? 0);
    const totalAccessories = Number(accessoryQtyAgg[0]?.total ?? 0);
    const totalConsumables = Number(consumableQtyAgg[0]?.total ?? 0);
    const totalComponents = Number(componentQtyAgg[0]?.total ?? 0);

    return NextResponse.json(
      {
        success: true,
        message: "Total Counts Fetched Successfully",
        data: {
          Assets: totalAssets,
          Licenses: totalLicenses,
          Accessories: totalAccessories,
          Consumables: totalConsumables,
          Components: totalComponents,
          People: totalPeople,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
        },
      }
    );
  } catch (error) {
    console.error("Error while fetching total counts", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error while fetching total counts",
      },
      { status: 500 }
    );
  }
}
