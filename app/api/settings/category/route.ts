import Department from "@/app/(dashboard)/settings/department/page";
import dbconnect from "@/lib/dbconnect";
import { LicenseModel } from "@/models/Licenses.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const { name, type, email } = await req.json();

    const category = new CategoryModel({ name, type, email });

    await category.save();

    return Response.json(
      {
        success: true,
        message: "Category created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error while creating category", error);
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
        message: "Error while creating category",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  await dbconnect();
  try {
    const categories = await CategoryModel.find().sort({ createdAt: -1 });
    const categorieswithAllData = await Promise.all(
      categories.map(async (category) => {
        const qty = await AssetModel_Model.countDocuments({
          category: category._id,
        });
        const license = await LicenseModel.countDocuments({
          category: category._id,
        });

        return { ...category.toObject(), qty, license };
      })
    );

    return Response.json(
      {
        success: true,
        message: "Categories fetched successfully",
        data: categorieswithAllData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching categories", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching categories",
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
      { message: "Missing Category ID" },
      { status: 400 }
    );
  }

  try {
    const deletedCategory = await CategoryModel.findByIdAndDelete(id);
    if (!deletedCategory) {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Category deleted successfully", deletedCategory },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error deleting Category", error: error.message },
      { status: 500 }
    );
  }
}
