import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AccessoriesModel } from "@/models/Accessories.model";
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
      { success: false, message: "Invalid accessory ID" },
      { status: 400 }
    );
  }

  try {
    const accessory = await AccessoriesModel.findOne({ _id: id, userId: workspaceId })
      .populate([
        { path: "category", select: "name" },
        { path: "company", select: "name" },
        { path: "location", select: "name" },
        { path: "manufacturer", select: "name" },
        { path: "supplier", select: "name" },
      ])
      .lean();

    if (!accessory) {
      return NextResponse.json(
        { success: false, message: "Accessory not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Accessory fetched successfully", data: accessory },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Error fetching accessory" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
      { success: false, message: "Invalid accessory ID" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    delete body.userId;

    const updated = await AccessoriesModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Accessory not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { success: true, message: "Accessory updated successfully", data: updated },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error updating accessory.", "Error updating accessory:");
  }
}

