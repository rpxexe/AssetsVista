import { apiErrorResponse } from "@/lib/apiError";
import dbconnect from "@/lib/dbconnect";
import { getAuthenticatedActor, getWorkspaceUserId } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { MaintenanceModel } from "@/models/Maintenance.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // overdue | open | completed
    const search = (searchParams.get("search") || "").trim();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const filter: Record<string, any> = { userId: workspaceId };
    if (status === "overdue") {
      filter.completed_at = null;
      filter.expected_completion_date = { $lt: todayStart };
    } else if (status === "open") {
      filter.completed_at = null;
    } else if (status === "completed") {
      filter.completed_at = { $ne: null };
    }

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const maintenances = await MaintenanceModel.find(filter)
      .sort({ completed_at: 1, expected_completion_date: 1, createdAt: -1 })
      .populate([
        { path: "asset", select: "asset_tag asset_name serial_number" },
        { path: "supplier", select: "name" },
      ])
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Maintenances fetched successfully",
        data: maintenances,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error fetching maintenances.", "Maintenance GET error:");
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const body = await req.json();

    if (!body.asset || !mongoose.Types.ObjectId.isValid(body.asset)) {
      return NextResponse.json(
        { success: false, message: "Valid Asset selection is required" },
        { status: 400 }
      );
    }
    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, message: "Maintenance title is required" },
        { status: 400 }
      );
    }

    const asset = await AssetModel.findOne({
      _id: body.asset,
      userId: actor.workspaceId,
    })
      .select("asset_tag asset_name")
      .lean<{ _id: any; asset_tag: string; asset_name?: string } | null>();

    if (!asset) {
      return NextResponse.json(
        { success: false, message: "Asset not found in this workspace" },
        { status: 404 }
      );
    }

    const doc = await MaintenanceModel.create({
      userId: actor.workspaceId,
      asset: asset._id,
      supplier:
        body.supplier && mongoose.Types.ObjectId.isValid(body.supplier)
          ? body.supplier
          : undefined,
      maintenance_type: body.maintenance_type || "Maintenance",
      title: body.title.trim(),
      is_warranty: Boolean(body.is_warranty),
      start_date: body.start_date ? new Date(body.start_date) : new Date(),
      expected_completion_date: body.expected_completion_date
        ? new Date(body.expected_completion_date)
        : undefined,
      completed_at: body.completed_at ? new Date(body.completed_at) : null,
      cost: body.cost ? Number(body.cost) : 0,
      notes: body.notes?.trim() || undefined,
    });

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: asset._id,
      item_type: "Asset",
      item_name: asset.asset_name || asset.asset_tag,
      action_type: "maintenance",
      admin_name: actor.dbUser.name || actor.dbUser.email,
      notes: `${doc.maintenance_type}: ${doc.title}`,
    }).catch(() => null);

    return NextResponse.json(
      {
        success: true,
        message: "Maintenance log created successfully",
        data: doc,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error creating maintenance.", "Maintenance POST error:");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const body = await req.json();
    const { id, action } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid maintenance ID" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (action === "complete") {
      update.completed_at = new Date();
    } else if (action === "reopen") {
      update.completed_at = null;
    } else {
      if (body.title !== undefined) update.title = String(body.title).trim();
      if (body.expected_completion_date !== undefined) {
        update.expected_completion_date = body.expected_completion_date
          ? new Date(body.expected_completion_date)
          : null;
      }
      if (body.cost !== undefined) update.cost = Number(body.cost) || 0;
      if (body.notes !== undefined) update.notes = body.notes;
    }

    const updated = await MaintenanceModel.findOneAndUpdate(
      { _id: id, userId: actor.workspaceId },
      { $set: update },
      { new: true }
    )
      .populate("asset", "asset_tag asset_name")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Maintenance record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: action === "complete" ? "Maintenance marked completed" : "Maintenance updated",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error updating maintenance.", "Maintenance PATCH error:");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid maintenance ID" },
        { status: 400 }
      );
    }

    const deleted = await MaintenanceModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Maintenance record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Maintenance deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error deleting maintenance.", "Maintenance DELETE error:");
  }
}

