import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import mongoose from "mongoose";
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

    const body = await req.json();
    const { name, model_no, categoryName, category, eol_rate, min_amt, image } = body;

    const catParam = category || categoryName;
    let categoryExists = null;

    if (catParam) {
      if (mongoose.Types.ObjectId.isValid(catParam)) {
        categoryExists = await CategoryModel.findOne({ _id: catParam, userId: workspaceId });
      }
      if (!categoryExists) {
        categoryExists = await CategoryModel.findOne({ userId: workspaceId, name: catParam });
      }
    }

    if (!categoryExists) {
      return NextResponse.json(
        {
          success: false,
          message: "Category does not exist",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Asset model name is required" },
        { status: 400 }
      );
    }

    const assetModel = new AssetModel_Model({
      userId: workspaceId,
      name,
      model_no,
      category: categoryExists._id,
      eol_rate: eol_rate !== undefined ? Number(eol_rate) : undefined,
      min_amt: min_amt !== undefined ? Number(min_amt) : 0,
      image: image || undefined,
    });

    await assetModel.save();
    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Asset model created successfully",
        data: assetModel,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating asset model.", "Error while creating asset model:");
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

    const query = [
      {
        path: "category",
        select: "name type",
      },
    ];
    const [assetModels, assetCounts] = await Promise.all([
      AssetModel_Model.find({ userId: workspaceId })
        .sort({ createdAt: -1 })
        .populate(query)
        .lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, asset_model: { $ne: null } } },
        { $group: { _id: "$asset_model", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map<string, number>();
    for (const item of assetCounts) {
      if (item._id) countMap.set(item._id.toString(), item.count);
    }

    const assetModelswithassets = assetModels.map((assetmodel: any) => ({
      ...assetmodel,
      assets: countMap.get(assetmodel._id.toString()) || 0,
    }));

    return NextResponse.json(
      {
        success: true,
        message: "Asset models fetched successfully",
        data: assetModelswithassets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching asset models", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error while fetching asset models",
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

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Missing or invalid Asset Model ID" }, { status: 400 });
  }

  try {
    const deletedAsset_Model = await AssetModel_Model.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedAsset_Model) {
      return NextResponse.json({ success: false, message: "Asset Model not found" }, { status: 404 });
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { success: true, message: "Asset Model deleted successfully", deletedAsset_Model },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error deleting asset model.", "Error deleting asset model:");
  }
}
