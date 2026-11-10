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
      totalLicenses,
      totalAccessories,
      totalConsumables,
      totalComponents,
      totalPeople,
    ] = await Promise.all([
      AssetModel.countDocuments(scope),
      LicenseModel.countDocuments(scope),
      AccessoriesModel.countDocuments(scope),
      ConsumableModel.countDocuments(scope),
      ComponentModel.countDocuments(scope),
      PeopleModel.countDocuments(scope),
    ]);

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
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
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
