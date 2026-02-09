import dbconnect from "@/lib/dbconnect";
import { AssetModel } from "@/models/Assets.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import mongoose from "mongoose";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await dbconnect();

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset ID" },
      { status: 400 }
    );
  }

  try {
    const query = [
      { path: "company", select: "name" },
      { path: "asset_model", select: "name" },
      { path: "status", select: "name" },
      { path: "location", select: "name" },
      { path: "manufacturer", select: "name" },
      { path: "supplier", select: "name" },
      { path: "department", select: "name" },
    ];

    const asset = await AssetModel.findById(id).populate(query).lean();

    return NextResponse.json(
      { success: true, message: "Asset fetched successfully", data: asset },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching asset", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching asset" },
      { status: 500 }
    );
  }
}



export async function PUT(
  req: NextRequest,
   context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // ✅ await params
  await dbconnect();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Validate required fields
    if (
      !data.companyName ||
      !data.asset_tag ||
      !data.assetModelName ||
      !data.statusName
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch related models in parallel to optimize performance
    const [
      company,
      assetModel,
      status,
      location,
      supplier,
      manufacturer,
      department,
    ] = await Promise.all([
      CompanyModel.findOne({ name: data.companyName }),
      AssetModel_Model.findOne({ name: data.assetModelName }),
      StatusModel.findOne({ name: data.statusName }),
      LocationModel.findOne({ name: data.locationName }),
      SupplierModel.findOne({ name: data.supplierName }),
      ManufacturerModel.findOne({ name: data.manufacturerName }),
      DepartmentModel.findOne({ name: data.departmentName }),
    ]);

    // Check if all required models exist
    if (!company)
      return NextResponse.json(
        { success: false, message: "Company does not exist" },
        { status: 404 }
      );
    if (!assetModel)
      return NextResponse.json(
        { success: false, message: "Asset Model does not exist" },
        { status: 404 }
      );
    if (!status)
      return NextResponse.json(
        { success: false, message: "Status does not exist" },
        { status: 404 }
      );
    if (!location)
      return NextResponse.json(
        { success: false, message: "Location does not exist" },
        { status: 404 }
      );
    if (!supplier)
      return NextResponse.json(
        { success: false, message: "Supplier does not exist" },
        { status: 404 }
      );
    if (!manufacturer)
      return NextResponse.json(
        { success: false, message: "Manufacturer does not exist" },
        { status: 404 }
      );
    if (!department)
      return NextResponse.json(
        { success: false, message: "Department does not exist" },
        { status: 404 }
      );

    // Update asset
    const updatedAsset = await AssetModel.findByIdAndUpdate(
      id,
      {
        company: company._id,
        asset_tag: data.asset_tag,
        serial_number: data.serial_number,
        assetModel: assetModel._id,
        status: status._id,
        location: location._id,
        supplier: supplier._id,
        manufacturer: manufacturer._id,
        department: department._id,
        asset_name: data.asset_name,
        warranty: data.warranty,
        order_number: data.order_number,
        purchase_date: data.purchase_date,
        eol_date: data.eol_date,
        purchase_cost: data.purchase_cost,
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedAsset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Asset updated successfully",
        asset: updatedAsset,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error while updating asset", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

