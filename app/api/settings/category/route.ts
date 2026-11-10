
import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { LicenseModel } from "@/models/Licenses.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";

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

    const { name, type, email } = await req.json();

    const category = new CategoryModel({ userId: workspaceId, name, type, email });

    await category.save();
    invalidateElasticIndexCache(workspaceId);

    return Response.json(
      {
        success: true,
        message: "Category created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating category.", "Error while creating category:");
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

    const [categories, assetModelCounts, licenseCounts] = await Promise.all([
      CategoryModel.find({ userId: workspaceId }).sort({ createdAt: -1 }).lean(),
      AssetModel_Model.aggregate([
        { $match: { userId: workspaceId, category: { $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      LicenseModel.aggregate([
        { $match: { userId: workspaceId, category: { $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const assetModelMap = new Map<string, number>();
    for (const item of assetModelCounts) {
      if (item._id) assetModelMap.set(item._id.toString(), item.count);
    }

    const licenseMap = new Map<string, number>();
    for (const item of licenseCounts) {
      if (item._id) licenseMap.set(item._id.toString(), item.count);
    }

    const categorieswithAllData = categories.map((cat: any) => {
      const idStr = cat._id.toString();
      return {
        ...cat,
        qty: assetModelMap.get(idStr) || 0,
        license: licenseMap.get(idStr) || 0,
      };
    });

    return Response.json(
      {
        success: true,
        message: "Categories fetched successfully",
        data: categorieswithAllData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching categories", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching categories",
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
      { message: "Missing Category ID" },
      { status: 400 }
    );
  }

  try {
    const deletedCategory = await CategoryModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedCategory) {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { message: "Category deleted successfully", deletedCategory },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting Category", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
