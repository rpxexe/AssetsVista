import dbconnect from "@/lib/dbconnect";
import { LocationModel } from "@/models/setting/Locations.model";

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
      { success: false, message: "Invalid or missing Location ID" },
      { status: 400 }
    );
  }

  try {
    const Location = await LocationModel.findById(params.id);

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
  { params }: { params: { id: string } }
) {
  await dbconnect();

  const { id } = params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing Location ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Update asset
    const updatedLocation = await LocationModel.findByIdAndUpdate(
      id,
      {
        name: data.name,
        currency: data.currency,
        address: data.address,
        city: data.city,
        state: data.state,
      
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedLocation) {
      return NextResponse.json(
        { success: false, message: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Location updated successfully",
        asset: updatedLocation,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error while updating Location", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

