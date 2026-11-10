import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
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

    const { name,
      url,
      support_url,
      support_phone,
      support_email,
      image } = await req.json();
    const manufacturer = new ManufacturerModel({
      userId: workspaceId,
      name,
      url,
      support_url,
      support_phone,
      support_email,
      image: image || undefined,
    });
    await manufacturer.save();
    invalidateElasticIndexCache(workspaceId);

    return Response.json(
      {
        success: true,
        message: "Manufacturer created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating manufacturer.", "Error while creating manufacturer:");
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

    const [manufacturers, assetCounts] = await Promise.all([
      ManufacturerModel.find({ userId: workspaceId }).sort({ createdAt: -1 }).lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, manufacturer: { $ne: null } } },
        { $group: { _id: "$manufacturer", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map<string, number>();
    for (const item of assetCounts) {
      if (item._id) countMap.set(item._id.toString(), item.count);
    }

    const manufacturerswithassets = manufacturers.map((manufacturer: any) => ({
      ...manufacturer,
      assets: countMap.get(manufacturer._id.toString()) || 0,
    }));
    return Response.json(
      {
        success: true,
        message: "manufacturer fetched successfully",
        data: manufacturerswithassets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching manufacturer", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching manufacturer",
      },
      { status: 500 }
    );
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
      { message: "Missing Manufacturer ID" },
      { status: 400 }
    );
  }

  try {
    const deletedManfacturer = await ManufacturerModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedManfacturer) {
      return NextResponse.json(
        { message: "Manufacturer not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { message: "Manufacturer deleted successfully", deletedManfacturer },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting Manufacturer", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}