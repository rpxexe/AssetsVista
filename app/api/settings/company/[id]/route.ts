import dbconnect from "@/lib/dbconnect";
import { CompanyModel } from "@/models/setting/Companies.model";

import mongoose from "mongoose";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Extract params from context

  await dbconnect();
  const { id } = await context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing Company ID" },
      { status: 400 }
    );
  }

  try {
    const Company = await CompanyModel.findById(id);

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

  const { id } = await context.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing Company ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Update asset
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
      id,
      {
        name: data.name,
        email: data.email,
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedCompany) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Company updated successfully",
        asset: updatedCompany,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error while updating Company", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

