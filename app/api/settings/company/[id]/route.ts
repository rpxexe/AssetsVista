import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { CompanyModel } from "@/models/setting/Companies.model";

import mongoose from "mongoose";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Extract params from context

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
      { success: false, message: "Invalid or missing Company ID" },
      { status: 400 }
    );
  }

  try {
    const Company = await CompanyModel.findOne({ _id: id, userId: workspaceId }).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Company fetched successfully",
        data: Company,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Company", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching Company" },
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
      { success: false, message: "Invalid or missing Company ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    const companyUpdate: Record<string, any> = {
      name: data.name,
      email: data.email,
    };
    if (data.image !== undefined) {
      companyUpdate.image = data.image;
    }

    // Update company
    const updatedCompany = await CompanyModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      companyUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Company updated successfully",
        asset: updatedCompany,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while updating company.", "Error while updating Company:");
  }
}

