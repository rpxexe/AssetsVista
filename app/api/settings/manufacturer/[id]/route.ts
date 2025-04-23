import dbconnect from "@/lib/dbconnect";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";

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
      { success: false, message: "Invalid or missing manufacturer ID" },
      { status: 400 }
    );
  }

  try {
    const manufacturer = await ManufacturerModel.findById(params.id);

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
  { params }: { params: { id: string } }
) {
  await dbconnect();

  const { id } = params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing Manufacturer ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Update asset
    const updatedManufacturer = await ManufacturerModel.findByIdAndUpdate(
      id,
      {
        name: data.name,
        url: data.url,
        support_url: data.support_url,
        support_email: data.support_email,
        support_phone: data.support_phone,
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedManufacturer) {
      return NextResponse.json(
        { success: false, message: "Manufacturer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Manufacturer updated successfully",
        asset: updatedManufacturer,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error while updating Manufacturer", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

