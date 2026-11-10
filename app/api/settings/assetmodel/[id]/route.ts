import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbconnect();

  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset model ID" },
      { status: 400 }
    );
  }

  try {
    const query = [{ path: "category", select: "name type" }];
    const asset = await AssetModel_Model.findOne({ _id: id, userId: workspaceId })
      .populate(query)
      .lean();

    if (!asset) {
      return NextResponse.json(
        { success: false, message: "Asset model not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Asset Model fetched successfully", data: asset },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching asset Model", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching asset model" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbconnect();
  const { id } = await context.params;

  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset Model ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    const updateFields: Record<string, any> = {};

    if (data.category || data.categoryName) {
      const catParam = data.category || data.categoryName;
      let category = null;
      if (mongoose.Types.ObjectId.isValid(catParam)) {
        category = await CategoryModel.findOne({ _id: catParam, userId: workspaceId });
      }
      if (!category) {
        category = await CategoryModel.findOne({ userId: workspaceId, name: catParam });
      }

      if (!category) {
        return NextResponse.json(
          { success: false, message: "Category does not exist" },
          { status: 404 }
        );
      }
      updateFields.category = category._id;
    }

    if (data.name !== undefined) updateFields.name = data.name;
    if (data.model_no !== undefined) updateFields.model_no = data.model_no;
    if (data.eol_rate !== undefined) updateFields.eol_rate = Number(data.eol_rate);
    if (data.image !== undefined) updateFields.image = data.image;

    const updatedAssetModel = await AssetModel_Model.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedAssetModel) {
      return NextResponse.json(
        { success: false, message: "Asset Model not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Asset Model updated successfully",
        data: updatedAssetModel,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error updating asset model.", "Error while updating asset Model:");
  }
}
