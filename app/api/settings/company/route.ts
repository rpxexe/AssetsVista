import dbconnect from "@/lib/dbconnect";
import { CompanyModel } from "@/models/setting/Companies.model";
import { AssetModel } from "@/models/Assets.model";
import { LicenseModel } from "@/models/Licenses.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const { name, email } = await req.json();
    const company = new CompanyModel({
      name,
      email
    });
    await company.save();

    return Response.json(
      {
        success: true,
        message: "Company created successfully",

      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error while creating Company", error);
    const mongoError = error as { code?: number; keyValue?: Record<string, string> };
    if (mongoError.code === 11000) {
      const key = Object.keys(mongoError.keyValue ?? {})[0];
      const value = mongoError.keyValue?.[key];
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
        message: "Error while creating Company",
      },
      { status: 500 }
    );
  }
}
export async function GET() {
  await dbconnect();
  try {
    ;
    const company = await CompanyModel.find().sort({ createdAt: -1 });
    const companyWithAllDetails = await Promise.all(
      company.map(async (comp) => {
        const assets = await AssetModel.countDocuments({ company: comp._id })
        const licenses = await LicenseModel.countDocuments({ company: comp._id })
        const department = await DepartmentModel.countDocuments({
          company: comp._id,
        });
        return { ...comp.toObject(), assets, licenses, department }
      })
    )

    return Response.json(
      {
        success: true,
        message: "company fetched successfully",
        data: companyWithAllDetails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching company", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching company",
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
    return NextResponse.json({ message: "Missing Company ID" }, { status: 400 });
  }

  try {
    const deletedCompany = await CompanyModel.findByIdAndDelete(id);
    if (!deletedCompany) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Company deleted successfully", deletedCompany },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting Company", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
