import dbconnect from "@/lib/dbconnect";
import { AssetModel } from "@/models/Assets.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const {
      companyName,
      asset_tag,
      serial_number,
      assetModelName,
      statusName,
      locationName,
      supplierName,
      manufacturerName,
      departmentName,
      asset_name,
      warranty,
      order_number,
      purchase_date,
      eol_date,
      purchase_cost,
    } = await req.json();

    //fetching AssetModel data in asset
    const CompanyExists = await CompanyModel.findOne({
      name: companyName,
    });
    if (!CompanyExists) {
      return Response.json(
        {
          success: false,
          message: "Company does not exist",
        },
        { status: 404 }
      );
    }
    //fetching AssetModel data in asset
    const AssetModelExists = await AssetModel_Model.findOne({
      name: assetModelName,
    });
    if (!AssetModelExists) {
      return Response.json(
        {
          success: false,
          message: "AssetsModel does not exist",
        },
        { status: 404 }
      );
    }

    //fetching Status data in asset
    const StatusExists = await StatusModel.findOne({
      name: statusName,
    });
    if (!StatusExists) {
      return Response.json(
        {
          success: false,
          message: "Status does not exist",
        },
        { status: 404 }
      );
    }

    //fetching Location data in asset
    const LocationExists = await LocationModel.findOne({
      name: locationName,
    });
    if (!LocationExists) {
      return Response.json(
        {
          success: false,
          message: "Location does not exist",
        },
        { status: 404 }
      );
    }

    //fetching Suppliers data in asset
    const SupplierExists = await SupplierModel.findOne({
      name: supplierName,
    });
    if (!SupplierExists) {
      return Response.json(
        {
          success: false,
          message: "supplier does not exist",
        },
        { status: 404 }
      );
    }
    //fetching manufacturer data in asset
    const ManufacturerExists = await ManufacturerModel.findOne({
      name: manufacturerName,
    });
    if (!ManufacturerExists) {
      return Response.json(
        {
          success: false,
          message: "manufacturer does not exist",
        },
        { status: 404 }
      );
    }
    const DepartmentExists = await DepartmentModel.findOne({
      name: departmentName,
    });
    if (!DepartmentExists) {
      return Response.json(
        {
          success: false,
          message: "Department does not exist",
        },
        { status: 404 }
      );
    }

    const asset = new AssetModel({
      company: CompanyExists._id,
      asset_tag,
      serial_number,
      asset_model: AssetModelExists._id,
      status: StatusExists._id,
      location: LocationExists._id,
      supplier: SupplierExists._id,
      manufacturer: ManufacturerExists._id,
      department: DepartmentExists._id,
      asset_name,
      warranty,
      order_number,
      purchase_date,
      eol_date,
      purchase_cost,
    });

    await asset.save();

    return Response.json(
      {
        success: true,
        message: "Asset created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error while creating asset", error);
    return Response.json(
      {
        success: false,
        message: "Error while creating asset",
      },
      { status: 500 }
    );
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
        path: "asset_model",
        select: "name",
      },
      {
        path: "status",
        select: "name",
      },
      {
        path: "location",
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
      {
        path: "department",
        select: "name",
      },
    ];
    const assets = await AssetModel.find()
      .sort({ createdAt: -1 })
      .populate(query)
      .lean();

    return Response.json(
      {
        success: true,
        message: "Assets fetched successfully",
        data: assets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching assets", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching assets",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  await dbconnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "Missing asset ID" }, { status: 400 });
  }

  try {
    const deletedAsset = await AssetModel.findByIdAndDelete(id);
    if (!deletedAsset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Asset deleted successfully", deletedAsset },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error deleting asset", error: error.message },
      { status: 500 }
    );
  }
}
