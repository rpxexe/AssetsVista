import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { StatusModel } from "@/models/setting/Status.model";


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
      { success: false, message: "Invalid or missing Status ID" },
      { status: 400 }
    );
  }

  try {
    const status = await StatusModel.findOne({ _id: id, userId: workspaceId }).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Status fetched successfully",
        data: status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Status", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching Status" },
      { status: 500 }
    );
  }
}



export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbconnect();
  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing status ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Update status
    const updatedStatus = await StatusModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      {
        name: data.name,
      },
      { new: true, runValidators: true }
    );

    if (!updatedStatus) {
      return NextResponse.json(
        { success: false, message: "Status not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Status updated successfully",
        asset: updatedStatus,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error updating Status.", "Error while updating Status:");
  }
}

