import dbconnect from "@/lib/dbconnect";
import { LicenseModel } from "@/models/Licenses.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbconnect();

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Missing license ID" },
      { status: 400 }
    );
  }

  try {
    const query = [
      {
        path: "company",
        select: "name",
      },
      {
        path: "category",
        select: "name",
      },
      {
        path: "manufacturer",
        select: "name",
      },
      {
        path: "supplier",
        select: "name",
      },
    ];

    const license = await LicenseModel.findById(id).populate(query).lean();

    
    if (!license) {
      return NextResponse.json(
        { success: false, message: "License not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, message: "License fetched successfully", data: license },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching license:", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching license" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbconnect();

  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing License ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

    // Validate required fields
    if (
      !data.companyName ||
      !data.supplierName ||
      !data.categoryName ||
      !data.manufacturerName
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch related models in parallel to optimize performance
    const [company, category, supplier, manufacturer] = await Promise.all([
      CompanyModel.findOne({ name: data.companyName }),
      CategoryModel.findOne({ name: data.categoryName }),
      SupplierModel.findOne({ name: data.supplierName }),
      ManufacturerModel.findOne({ name: data.manufacturerName }),
      
    ]);

    // Check if all required models exist
    if (!company)
      return NextResponse.json(
        { success: false, message: "Company does not exist" },
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
    if (!category)
      return NextResponse.json(
        { success: false, message: "Category does not exist" },
        { status: 404 }
      );

    // Update asset
    const updatedLicense = await LicenseModel.findByIdAndUpdate(
      id,
      {
        company: company._id,
        name: data.name,
        product_key: data.product_key,
        supplier: supplier._id,
        manufacturer: manufacturer._id,
        category: category._id,
        license_to_name: data.license_to_name,
        license_to_email: data.license_to_email,
        seats: data.seats,
        order_number: data.order_number,
        purchase_date: data.purchase_date,
        expiry_date: data.expiry_date,
        termination_date: data.termination_date,
        purchase_cost: data.purchase_cost,
      },
      { new: true, runValidators: true } // Return updated document and apply validation
    );

    if (!updatedLicense) {
      return NextResponse.json(
        { success: false, message: "License not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "License updated successfully",
        asset: updatedLicense,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error while updating License", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}
