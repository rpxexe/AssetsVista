import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { name, currency, address, city, state, image } = await req.json();
    const location = new LocationModel({
      userId: workspaceId,
      name,
      currency,
      address,
      city,
      state,
      image: image || undefined,
    });
    await location.save();
    invalidateElasticIndexCache(workspaceId);

    return Response.json(
      {
        success: true,
        message: "location created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating Location.", "Error while creating Location:");
  }
}
export async function GET() {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const [locations, assetCounts, deptCounts] = await Promise.all([
      LocationModel.find({ userId: workspaceId }).sort({ createdAt: -1 }).lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, location: { $ne: null } } },
        { $group: { _id: "$location", count: { $sum: 1 } } },
      ]),
      DepartmentModel.aggregate([
        { $match: { userId: workspaceId, location: { $ne: null } } },
        { $group: { _id: "$location", count: { $sum: 1 } } },
      ]),
    ]);

    const assetMap = new Map<string, number>();
    for (const item of assetCounts) {
      if (item._id) assetMap.set(item._id.toString(), item.count);
    }

    const deptMap = new Map<string, number>();
    for (const item of deptCounts) {
      if (item._id) deptMap.set(item._id.toString(), item.count);
    }

    const locationWithAllData = locations.map((loc: any) => {
      const idStr = loc._id.toString();
      return {
        ...loc,
        assets: assetMap.get(idStr) || 0,
        department: deptMap.get(idStr) || 0,
      };
    });

    return Response.json(
      {
        success: true,
        message: "Location fetched successfully",
        data: locationWithAllData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Location", error)
    return Response.json({
      success: false,
      message: "Error while fetching Location",
    }, { status: 500 })
  }
}


export async function DELETE(req: NextRequest) {
  await dbconnect();
  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { message: "Missing Location ID" },
      { status: 400 }
    );
  }

  try {
    const deletedLocation = await LocationModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedLocation) {
      return NextResponse.json(
        { message: "Location not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { message: "Location deleted successfully", deletedLocation },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting Location", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}