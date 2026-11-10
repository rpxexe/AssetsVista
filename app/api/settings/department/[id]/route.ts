import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { CompanyModel } from "@/models/setting/Companies.model";

import { DepartmentModel } from "@/models/setting/Departments.model";
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
      { success: false, message: "Invalid or missing Department ID" },
      { status: 400 }
    );
  }

  try {
    const Department = await DepartmentModel.findOne({ _id: id, userId: workspaceId }).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Department fetched successfully",
        data: Department,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Department", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching Department" },
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
      { success: false, message: "Invalid or missing Department ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();
    if (!data.companyName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch related models in parallel scoped to workspace
    const [company, location] = await Promise.all([
      CompanyModel.findOne({ userId: workspaceId, name: data.companyName }),
      LocationModel.findOne({ userId: workspaceId, name: data.locationName }),
    ]);

    if (!company)
      return NextResponse.json(
        { success: false, message: "company does not exist" },
        { status: 404 }
      );
    if (!location)
      return NextResponse.json(
        { success: false, message: "location does not exist" },
        { status: 404 }
      );

    const updatedDepartment = await DepartmentModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      {
        name: data.name,
        company: company._id,
        phone: data.phone,
        location: location._id,
      },
      { new: true, runValidators: true }
    );

    if (!updatedDepartment) {
      return NextResponse.json(
        { success: false, message: "Department not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Department updated successfully",
        asset: updatedDepartment,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error updating Department.", "Error while updating Department:");
  }
}

