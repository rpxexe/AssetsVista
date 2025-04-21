import dbconnect from "@/lib/dbconnect";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";


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
      { success: false, message: "Invalid or missing Supplier ID" },
      { status: 400 }
    );
  }

  try {
    const supplier = await SupplierModel.findById(params.id);

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
  { params }: { params: { id: string } }
) {
  await dbconnect();

  const { id } = params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing supplier ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Update asset
    const updatedSupplier = await SupplierModel.findByIdAndUpdate(
      id,
      {
        name: data.name,
        address: data.address,
        contact_name: data.contact_name,
        email: data.email,
        phone: data.phone,
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedSupplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Supplier updated successfully",
        asset: updatedSupplier,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error while updating Supplier", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

