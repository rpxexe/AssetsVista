import dbconnect from "@/lib/dbconnect";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";

import mongoose from "mongoose";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // Extract params from context

  await dbconnect();

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset model ID" },
      { status: 400 }
    );
  }

  try {
    const query = [
      { path: "category", select: "name" },

    ];

    const asset = await AssetModel_Model.findById(id).populate(query).lean();

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
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset Model ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Validate required fields
    if (
      !data.categoryName
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch related models in parallel to optimize performance
    const [
      category
    ] = await Promise.all([
      CategoryModel.findOne({ name: data.categoryName }),

    ]);

    // Check if all required models exist
    if (!category)
      return NextResponse.json(
        { success: false, message: "Category does not exist" },
        { status: 404 }
      );

    // Update asset
    const updatedAssetModel = await AssetModel_Model.findByIdAndUpdate(
      id,
      {
        name: data.name,
        category: category._id,
        model_no: data.model_no,
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedAssetModel) {
      return NextResponse.json(
        { success: false, message: "Asset Model not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Asset Model updated successfully",
        asset: updatedAssetModel,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error while updating asset Model", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

