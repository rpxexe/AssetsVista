import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { LocationModel } from "@/models/setting/Locations.model";

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
      { success: false, message: "Invalid or missing Location ID" },
      { status: 400 }
    );
  }

  try {
    const Location = await LocationModel.findOne({ _id: id, userId: workspaceId }).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Location fetched successfully",
        data: Location,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Location", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching Location" },
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
      { success: false, message: "Invalid or missing Location ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    const locationUpdate: Record<string, any> = {
      name: data.name,
      currency: data.currency,
      address: data.address,
      city: data.city,
      state: data.state,
    };
    if (data.image !== undefined) {
      locationUpdate.image = data.image;
    }

    // Update location
    const updatedLocation = await LocationModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      locationUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return NextResponse.json(
        { success: false, message: "Location not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Location updated successfully",
        asset: updatedLocation,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while updating location.", "Error while updating Location:");
  }
}

