import dbconnect from "@/lib/dbconnect";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";

import mongoose from "mongoose";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context; // Extract params from context

  await dbconnect();

  if (!params?.id || !mongoose.Types.ObjectId.isValid(params.id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing Category ID" },
      { status: 400 }
    );
  }

  try {
    const category = await CategoryModel.findById(params.id);

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
  { params }: { params: { id: string } }
) {
  await dbconnect();

  const { id } = params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing category ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Update asset
    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      id,
      {
        name:data.name,
        type:data.type,
        email:data.email,
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, message: "category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "category updated successfully",
        asset: updatedCategory,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error while updating category", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

