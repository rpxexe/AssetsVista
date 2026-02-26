import dbconnect from "@/lib/dbconnect";
import { LicenseModel } from "@/models/Licenses.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const {
      name,
      categoryName,
      product_key,
      companyName,
      supplierName,
      manufacturerName,
      license_to_name,
      license_to_email,
      seats,
      expiry_date,
      order_number,
      purchase_date,
      termination_date,
      purchase_cost,
    } = await req.json();
    //Fetching compnay by company name
    const companyExists = await CompanyModel.findOne({
      name: companyName,
    });
    if (!companyExists) {
      return Response.json({
        success: false,
        message: "Company not found",
      });
    }
    //Fetching supplier by supplier name
    const supplierExists = await SupplierModel.findOne({
      name: supplierName,
    });
    if (!supplierExists) {
      return Response.json({
        success: false,
        message: "supplier not found",
      });
    }
    //Fetching manufacturer by manufacturer name
    const manufacturerExists = await ManufacturerModel.findOne({
      name: manufacturerName,
    });
    if (!manufacturerExists) {
      return Response.json({
        success: false,
        message: "manufcaturer not found",
      });
    }
    //Fetching category by category name
    const categoryExists = await CategoryModel.findOne({
      name: categoryName,
    });
    if (!categoryExists) {
      return Response.json({
        success: false,
        message: "Category not found",
      });
    }
    const license = new LicenseModel({
      name,
      category: categoryExists._id,
      product_key,
      company: companyExists._id,
      supplier: supplierExists._id,
      manufacturer: manufacturerExists._id,
      license_to_name,
      license_to_email,
      seats,
      expiry_date,
      order_number,
      purchase_date,
      termination_date,
      purchase_cost,
    });
    await license.save();
    return Response.json({
      success: true,
      message: "License created successfully",
    });
  } catch (error) {
    console.error("Error while creating license", error);
    return Response.json({
      success: false,
      message: "Error while creating license",
    });
  }
}

export async function GET() {
  await dbconnect();
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
    const licenses = await LicenseModel.find()
      .sort({ createdAt: -1 })
      .populate(query)
      .lean();

    return Response.json({
      success: true,
      message: "Licenses fetched successfully",
      data: licenses,
    });
  } catch (error) {
    console.error("Error while fetching licenses", error);
    return Response.json({
      success: false,
      message: "Error while fetching licenses",
    });
  }
}

export async function DELETE(req: NextRequest) {
  await dbconnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { message: "Missing License ID" },
      { status: 400 }
    );
  }

  try {
    const deletedLicense = await LicenseModel.findByIdAndDelete(id);
    if (!deletedLicense) {
      return NextResponse.json(
        { message: "License not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "License deleted successfully", deletedLicense },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting License", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
