import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
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

    const { name, companyName, phone, locationName } = await req.json();

    const companyExists = await CompanyModel.findOne({
      userId: workspaceId,
      name: companyName,
    });
    if (!companyExists) {
      return Response.json(
        {
          success: false,
          message: "Company does not exist",
        },
        { status: 404 }
      );
    }
    const locationExists = await LocationModel.findOne({
      userId: workspaceId,
      name: locationName,
    });
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
      userId: workspaceId,
      name,
      company: companyExists._id,
      phone,
      location: locationExists._id,
    });

    await department.save();
    invalidateElasticIndexCache(workspaceId);

    return Response.json(
      {
        success: true,
        message: "Department created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating Department.", "Error while creating Department:");
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
    const [departments, assetCounts] = await Promise.all([
      DepartmentModel.find({ userId: workspaceId })
        .sort({ createdAt: -1 })
        .populate(query)
        .lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, department: { $ne: null } } },
        { $group: { _id: "$department", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map<string, number>();
    for (const item of assetCounts) {
      if (item._id) countMap.set(item._id.toString(), item.count);
    }

    const departmentWithAllDetails = departments.map((department: any) => ({
      ...department,
      assets: countMap.get(department._id.toString()) || 0,
    }));

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
    return NextResponse.json(
      { message: "Missing Department ID" },
      { status: 400 }
    );
  }

  try {
    const deletedDepartment = await DepartmentModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedDepartment) {
      return NextResponse.json(
        { message: "Department not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { message: "Department deleted successfully", deletedDepartment },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting Department", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}