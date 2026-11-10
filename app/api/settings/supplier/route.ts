import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";

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

    const { name, address, contact_name, email, phone, image } = await req.json();
    const supplier = new SupplierModel({
      userId: workspaceId,
      name,
      address,
      contact_name,
      email,
      phone,
      image: image || undefined,
    });
    await supplier.save();
    invalidateElasticIndexCache(workspaceId);

    return Response.json(
      {
        success: true,
        message: "Supplier Created Successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating Supplier.", "Error while creating Supplier:");
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

    const [suppliers, assetCounts] = await Promise.all([
      SupplierModel.find({ userId: workspaceId }).sort({ createdAt: -1 }).lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, supplier: { $ne: null } } },
        { $group: { _id: "$supplier", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map<string, number>();
    for (const item of assetCounts) {
      if (item._id) countMap.set(item._id.toString(), item.count);
    }

    const supplierwithassets = suppliers.map((supplier: any) => ({
      ...supplier,
      assets: countMap.get(supplier._id.toString()) || 0,
    }));

    return Response.json(
      {
        success: true,
        message: "Supplier fetched Successfully",
        data: supplierwithassets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching Supplier", error)
    return Response.json({
      success: false,
      message: "Error while fetching Supplier",
    }, { status: 500 })
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
      { message: "Missing Supplier ID" },
      { status: 400 }
    );
  }

  try {
    const deletedSupplier = await SupplierModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedSupplier) {
      return NextResponse.json(
        { message: "Supplier not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { message: "Supplier deleted successfully", deletedSupplier },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting Supplier", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}