import dbconnect from "@/lib/dbconnect";
import { StatusModel } from "@/models/setting/Status.model";


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
      { success: false, message: "Invalid or missing Status ID" },
      { status: 400 }
    );
  }

  try {
    const status = await StatusModel.findById(params.id);

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
  { params }: { params: { id: string } }
) {
  await dbconnect();

  const { id } = params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing status ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Update asset
    const updatedStatus = await StatusModel.findByIdAndUpdate(
      id,
      {
        name: data.name,
        
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedStatus) {
      return NextResponse.json(
        { success: false, message: "Status not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Status updated successfully",
        asset: updatedStatus,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error while updating Status", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

