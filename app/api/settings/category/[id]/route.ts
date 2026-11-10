import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";

import { CategoryModel } from "@/models/setting/Categories.model";

import mongoose from "mongoose";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // Extract params from context

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
      { success: false, message: "Invalid or missing Category ID" },
      { status: 400 }
    );
  }

  try {
    const category = await CategoryModel.findOne({ _id: id, userId: workspaceId }).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Category fetched successfully",
        data: category,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching category", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching category" },
      { status: 500 }
    );
  }
}



export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbconnect();
  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing category ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Update category
    const updatedCategory = await CategoryModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      {
        name: data.name,
        type: data.type,
        email: data.email,
      },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, message: "category not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "category updated successfully",
        asset: updatedCategory,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error updating category.", "Error while updating category:");
  }
}

