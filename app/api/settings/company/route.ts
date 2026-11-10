import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { CompanyModel } from "@/models/setting/Companies.model";
import { AssetModel } from "@/models/Assets.model";
import { LicenseModel } from "@/models/Licenses.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { name, email, image } = await req.json();
    const company = new CompanyModel({
      userId: workspaceId,
      name,
      email,
      image: image || undefined,
    });
    await company.save();
    invalidateElasticIndexCache(workspaceId);

    return Response.json(
      {
        success: true,
        message: "Company created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating Company.", "Error while creating Company:");
  }
}
export async function GET() {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const [companies, assetCounts, licenseCounts, deptCounts] = await Promise.all([
      CompanyModel.find({ userId: workspaceId }).sort({ createdAt: -1 }).lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, company: { $ne: null } } },
        { $group: { _id: "$company", count: { $sum: 1 } } },
      ]),
      LicenseModel.aggregate([
        { $match: { userId: workspaceId, company: { $ne: null } } },
        { $group: { _id: "$company", count: { $sum: 1 } } },
      ]),
      DepartmentModel.aggregate([
        { $match: { userId: workspaceId, company: { $ne: null } } },
        { $group: { _id: "$company", count: { $sum: 1 } } },
      ]),
    ]);

    const assetMap = new Map<string, number>();
    for (const item of assetCounts) {
      if (item._id) assetMap.set(item._id.toString(), item.count);
    }

    const licenseMap = new Map<string, number>();
    for (const item of licenseCounts) {
      if (item._id) licenseMap.set(item._id.toString(), item.count);
    }

    const deptMap = new Map<string, number>();
    for (const item of deptCounts) {
      if (item._id) deptMap.set(item._id.toString(), item.count);
    }

    const companyWithAllDetails = companies.map((comp: any) => {
      const idStr = comp._id.toString();
      return {
        ...comp,
        assets: assetMap.get(idStr) || 0,
        licenses: licenseMap.get(idStr) || 0,
        department: deptMap.get(idStr) || 0,
      };
    });

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
  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "Missing Company ID" }, { status: 400 });
  }

  try {
    const deletedCompany = await CompanyModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedCompany) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

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
