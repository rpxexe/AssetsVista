import dbconnect from "@/lib/dbconnect";
import { CompanyModel } from "@/models/setting/Companies.model";

import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";

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
      { success: false, message: "Invalid or missing Department ID" },
      { status: 400 }
    );
  }

  try {
    const Department = await DepartmentModel.findById(id);

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

  const { id } = await context.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing Department ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();
    if (
      !data.companyName
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch related models in parallel to optimize performance
    const [
      company,
      location
    ] = await Promise.all([
      CompanyModel.findOne({ name: data.companyName }),
      LocationModel.findOne({ name: data.locationName }),

    ]);

    // Check if all required models exist
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
    // Update asset
    const updatedDepartment = await DepartmentModel.findByIdAndUpdate(
      id,
      {
        name: data.name,
        company: company._id,
        phone: data.phone,
        location: location._id,

      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedDepartment) {
      return NextResponse.json(
        { success: false, message: "Department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Department updated successfully",
        asset: updatedDepartment,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error while updating Department", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

