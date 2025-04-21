import dbconnect from "@/lib/dbconnect";
import { AssetModel } from "@/models/Assets.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const { name, companyName, phone, locationName } = await req.json();

    const companyExists = await CompanyModel.findOne({ name: companyName });
    if (!companyExists) {
      return Response.json(
        {
          success: false,
          message: "Company does not exist",
        },
        { status: 404 }
      );
    }
    const locationExists = await LocationModel.findOne({ name: locationName });
    if (!locationExists) {
      return Response.json(
        {
          success: false,
          message: "Location does not exist",
        },
        { status: 404 }
      );
    }
    const department = new DepartmentModel({
      name,
      company:companyExists._id,
      phone,
      location:locationExists._id
    });

    await department.save();

    return Response.json(
      {
        success: true,
        message: "Department created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error while creating Department", error);
    if (error.code === 11000) {
      const key = Object.keys(error.keyValue)[0];
      const value = error.keyValue[key];
      return Response.json(
        {
          success: false,
          message: `${value} is already Added`,
        },
        { status: 500 }
      );
    }
    return Response.json(
      {
        success: false,
        message: "Error while creating Department",
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
        path: "location",
        select: "name",
      },
      
    ];
    const departments = await DepartmentModel.find()
      .sort({ createdAt: -1 })
      .populate(query)
      .lean();
    const departmentWithAllDetails = await Promise.all(
      departments.map(async (department) => {
        const assets = await AssetModel.countDocuments({
          department: department._id,
        });
        return { ...department, assets };
      })
    );

    return Response.json(
      {
        success: true,
        message: "Department fetched successfully",
        data: departmentWithAllDetails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Department", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching Department",
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
    return NextResponse.json(
      { message: "Missing Department ID" },
      { status: 400 }
    );
  }

  try {
    const deletedDepartment = await DepartmentModel.findByIdAndDelete(id);
    if (!deletedDepartment) {
      return NextResponse.json(
        { message: "Department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Department deleted successfully", deletedDepartment },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error deleting Department", error: error.message },
      { status: 500 }
    );
  }
}