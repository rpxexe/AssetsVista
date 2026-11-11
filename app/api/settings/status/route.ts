
import { StatusModel } from "@/models/setting/Status.model";
import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";

import { AssetModel } from "@/models/Assets.model";
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

    const { name } = await req.json();
    const status = new StatusModel({ userId: workspaceId, name });
    await status.save();
    invalidateElasticIndexCache(workspaceId);

    return Response.json(
      {
        success: true,
        message: "Status created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating status.", "Error while creating status:");
  }
}
export async function GET(req: NextRequest) {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get("groupBy"); // "name" (default) | "type"

    const [statuses, assetCounts] = await Promise.all([
      StatusModel.find({ userId: workspaceId }).sort({ createdAt: -1 }).lean(),
      AssetModel.aggregate([
        { $match: { userId: workspaceId, status: { $ne: null } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map<string, number>();
    for (const item of assetCounts) {
      if (item._id) countMap.set(item._id.toString(), item.count);
    }

    const statuswithassets = statuses.map((status: any) => ({
      ...status,
      assets: countMap.get(status._id.toString()) || 0,
    }));

    if (groupBy === "type") {
      const buckets: Record<string, number> = {
        Deployable: 0,
        Pending: 0,
        Undeployable: 0,
        Archived: 0,
      };
      const labelMap: Record<string, string> = {
        deployable: "Deployable",
        pending: "Pending",
        undeployable: "Undeployable",
        archived: "Archived",
      };
      for (const st of statuswithassets) {
        const key = labelMap[String(st.type || "deployable").toLowerCase()] || "Deployable";
        buckets[key] = (buckets[key] || 0) + Number(st.assets || 0);
      }
      const grouped = Object.entries(buckets).map(([name, assets]) => ({
        name,
        type: name.toLowerCase(),
        assets,
      }));
      return Response.json(
        {
          success: true,
          message: "Status Fetched successfully",
          data: grouped,
        },
        { status: 200 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Status Fetched successfully",
        data: statuswithassets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching status", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching status",
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
      { message: "Missing Status ID" },
      { status: 400 }
    );
  }

  try {
    const deletedSatus = await StatusModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedSatus) {
      return NextResponse.json(
        { message: "Status not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { message: "Status deleted successfully", deletedSatus },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting Status", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}