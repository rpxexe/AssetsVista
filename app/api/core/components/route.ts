import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { ComponentModel } from "@/models/Components.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

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
    const search = searchParams.get("search");

    const filter: Record<string, any> = { userId: workspaceId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { serial_number: { $regex: search, $options: "i" } },
      ];
    }

    const components = await ComponentModel.find(filter)
      .sort({ createdAt: -1 })
      .populate([
        { path: "category", select: "name" },
        { path: "company", select: "name" },
        { path: "location", select: "name" },
        { path: "manufacturer", select: "name" },
        { path: "supplier", select: "name" },
      ])
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Components fetched successfully",
        data: components,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching components:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching components" },
      { status: 500 }
    );
  }
}

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

    const body = await req.json();

    if (!body.name || !body.category || !body.company) {
      return NextResponse.json(
        { success: false, message: "Name, category, and company are required" },
        { status: 400 }
      );
    }

    const component = new ComponentModel({
      userId: workspaceId,
      name: body.name,
      category: body.category,
      company: body.company,
      manufacturer: body.manufacturer || undefined,
      supplier: body.supplier || undefined,
      location: body.location || undefined,
      serial_number: body.serial_number,
      order_number: body.order_number,
      qty: body.qty ? Number(body.qty) : 0,
      min_amt: body.min_amt ? Number(body.min_amt) : 0,
      purchase_cost: body.purchase_cost ? Number(body.purchase_cost) : 0,
      purchase_date: body.purchase_date ? new Date(body.purchase_date) : new Date(),
      image: body.image || undefined,
    });

    await component.save();

    await ActionLogModel.create({
      userId: workspaceId,
      item_id: component._id,
      item_type: "Component",
      item_name: component.name,
      action_type: "create",
      notes: `Component created with qty ${component.qty}`,
    });

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Component created successfully",
        data: component,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error creating component.", "Error creating component:");
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

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid component ID" },
      { status: 400 }
    );
  }

  try {
    const deleted = await ComponentModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Component not found" },
        { status: 404 }
      );
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { success: true, message: "Component deleted successfully", data: deleted },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error deleting component.", "Error deleting component:");
  }
}

