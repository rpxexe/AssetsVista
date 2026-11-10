import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";

import mongoose from "mongoose";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
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
      { success: false, message: "Invalid or missing manufacturer ID" },
      { status: 400 }
    );
  }

  try {
    const manufacturer = await ManufacturerModel.findOne({ _id: id, userId: workspaceId }).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Manufacturer fetched successfully",
        data: manufacturer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Manufacturer", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching Manufacturer" },
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
      { success: false, message: "Invalid or missing Manufacturer ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    const manufacturerUpdate: Record<string, any> = {
      name: data.name,
      url: data.url,
      support_url: data.support_url,
      support_email: data.support_email,
      support_phone: data.support_phone,
    };
    if (data.image !== undefined) {
      manufacturerUpdate.image = data.image;
    }

    // Update manufacturer
    const updatedManufacturer = await ManufacturerModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      manufacturerUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedManufacturer) {
      return NextResponse.json(
        { success: false, message: "Manufacturer not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Manufacturer updated successfully",
        asset: updatedManufacturer,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while updating manufacturer.", "Error while updating Manufacturer:");
  }
}

