import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { SupplierModel } from "@/models/setting/Suppliers.model";


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
      { success: false, message: "Invalid or missing Supplier ID" },
      { status: 400 }
    );
  }

  try {
    const supplier = await SupplierModel.findOne({ _id: id, userId: workspaceId }).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Supplier fetched successfully",
        data: supplier,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching supplier", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching supplier" },
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
      { success: false, message: "Invalid or missing supplier ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    const supplierUpdate: Record<string, any> = {
      name: data.name,
      address: data.address,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone,
    };
    if (data.image !== undefined) {
      supplierUpdate.image = data.image;
    }

    // Update supplier
    const updatedSupplier = await SupplierModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      supplierUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedSupplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Supplier updated successfully",
        asset: updatedSupplier,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while updating supplier.", "Error while updating Supplier:");
  }
}

