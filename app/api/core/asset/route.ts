import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId, requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const authResult = await requirePermission(
      "canCreateEditAssets",
      "Only Admin or Assets User roles can create assets."
    );
    if ("error" in authResult) {
      return authResult.error;
    }
    const workspaceId = authResult.actor.workspaceId;

    const body = await req.json();

    // Helper to resolve entity either by ObjectId or by string name scoped to workspace
    const resolveEntity = async (
      model: mongoose.Model<any>,
      idOrName: string | undefined,
      nameKey = "name"
    ): Promise<{ _id: mongoose.Types.ObjectId } | null> => {
      if (!idOrName) return null;
      if (mongoose.Types.ObjectId.isValid(idOrName)) {
        const found = await model
          .findOne({ _id: idOrName, userId: workspaceId })
          .select("_id")
          .lean<{ _id: mongoose.Types.ObjectId }>();
        if (found) return found;
      }
      return await model
        .findOne({ userId: workspaceId, [nameKey]: idOrName })
        .select("_id")
        .lean<{ _id: mongoose.Types.ObjectId }>();
    };

    // Parallelize all 7 entity resolutions simultaneously
    const [
      company,
      assetModel,
      status,
      location,
      supplier,
      manufacturer,
      department,
    ] = await Promise.all([
      resolveEntity(CompanyModel, body.company || body.companyName || body.companyId),
      resolveEntity(AssetModel_Model, body.asset_model || body.assetModelName || body.assetModelId),
      resolveEntity(StatusModel, body.status || body.statusName || body.statusId),
      resolveEntity(LocationModel, body.location || body.locationName || body.locationId),
      resolveEntity(SupplierModel, body.supplier || body.supplierName || body.supplierId),
      resolveEntity(ManufacturerModel, body.manufacturer || body.manufacturerName || body.manufacturerId),
      resolveEntity(DepartmentModel, body.department || body.departmentName || body.departmentId),
    ]);

    if (!company) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 400 }
      );
    }
    if (!assetModel) {
      return NextResponse.json(
        { success: false, message: "Asset Model not found" },
        { status: 400 }
      );
    }
    if (!status) {
      return NextResponse.json(
        { success: false, message: "Status not found" },
        { status: 400 }
      );
    }
    if (!location) {
      return NextResponse.json(
        { success: false, message: "Location not found" },
        { status: 400 }
      );
    }
    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 400 }
      );
    }
    if (!manufacturer) {
      return NextResponse.json(
        { success: false, message: "Manufacturer not found" },
        { status: 400 }
      );
    }
    if (!department) {
      return NextResponse.json(
        { success: false, message: "Department not found" },
        { status: 400 }
      );
    }

    if (!body.asset_tag) {
      return NextResponse.json(
        { success: false, message: "Asset tag is required" },
        { status: 400 }
      );
    }

    if (!body.serial_number) {
      return NextResponse.json(
        { success: false, message: "Serial number is required" },
        { status: 400 }
      );
    }

    const existingAsset = await AssetModel.findOne({
      userId: workspaceId,
      $or: [
        { asset_tag: body.asset_tag },
        { serial_number: body.serial_number },
      ],
    });

    if (existingAsset) {
      return NextResponse.json(
        {
          success: false,
          message:
            existingAsset.asset_tag === body.asset_tag
              ? `Asset Tag '${body.asset_tag}' already exists`
              : `Serial Number '${body.serial_number}' already exists`,
        },
        { status: 409 }
      );
    }

    const asset = new AssetModel({
      userId: workspaceId,
      company: company._id,
      asset_tag: body.asset_tag,
      serial_number: body.serial_number,
      asset_model: assetModel._id,
      status: status._id,
      location: location._id,
      supplier: supplier._id,
      manufacturer: manufacturer._id,
      department: department._id,
      asset_name: body.asset_name,
      warranty: body.warranty ? Number(body.warranty) : 0,
      order_number: body.order_number,
      purchase_date: body.purchase_date
        ? new Date(body.purchase_date)
        : new Date(),
      eol_date: body.eol_date ? new Date(body.eol_date) : undefined,
      purchase_cost: body.purchase_cost ? Number(body.purchase_cost) : 0,
      assigned_to: body.assigned_to || null,
      assigned_type: body.assigned_type || null,
      checkout_date: body.checkout_date ? new Date(body.checkout_date) : null,
      expected_checkin_date: body.expected_checkin_date
        ? new Date(body.expected_checkin_date)
        : null,
      notes: body.notes,
      image: body.image || undefined,
    });

    await asset.save();

    // Log the creation
    try {
      await ActionLogModel.create({
        userId: workspaceId,
        item_id: asset._id,
        item_type: "Asset",
        item_name: asset.asset_name || asset.asset_tag,
        action_type: "create",
        notes: "Asset created",
      });
    } catch (logErr) {
      console.error("ActionLog error:", logErr);
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Asset created successfully",
        data: asset,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating asset", "Error while creating asset:");
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
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");
    const assignedParam = searchParams.get("assigned");
    const filterParam = searchParams.get("filter");
    const pastEolParam = searchParams.get("past_eol");

    const filter: Record<string, any> = { userId: workspaceId };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (filterParam === "due_audit") {
      filter.$or = [
        { next_audit_date: { $lt: todayStart } },
        { next_audit_date: null, last_audit_date: null },
      ];
    } else if (filterParam === "overdue_audit") {
      filter.next_audit_date = { $lt: todayStart };
    } else if (filterParam === "due_checkin") {
      filter.assigned_to = { $ne: null };
      filter.expected_checkin_date = { $lt: todayStart };
    }

    if (pastEolParam === "1" || pastEolParam === "true") {
      filter.eol_date = { $lt: todayStart };
    }

    // Filter by status if provided (by name or ID or special status)
    if (statusParam) {
      if (statusParam.toLowerCase() === "checkedout") {
        filter.assigned_to = { $ne: null };
      } else if (mongoose.Types.ObjectId.isValid(statusParam)) {
        filter.status = statusParam;
      } else {
        const foundStatus = await StatusModel.findOne({
          userId: workspaceId,
          name: { $regex: new RegExp(`^${statusParam}$`, "i") },
        });
        if (foundStatus) {
          filter.status = foundStatus._id;
        } else {
          return NextResponse.json({
            success: true,
            message: "Assets fetched successfully",
            data: [],
          });
        }
      }
    }

    // Filter by assigned status (checkout)
    if (assignedParam === "true") {
      filter.assigned_to = { $ne: null };
    } else if (assignedParam === "false") {
      filter.assigned_to = null;
    }

    // Search keyword (preserve existing $or filter if already present)
    if (searchParam) {
      const searchCond = [
        { asset_tag: { $regex: searchParam, $options: "i" } },
        { serial_number: { $regex: searchParam, $options: "i" } },
        { asset_name: { $regex: searchParam, $options: "i" } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchCond }];
        delete filter.$or;
      } else {
        filter.$or = searchCond;
      }
    }

    const query = [
      { path: "company", select: "name" },
      { path: "asset_model", select: "name model_no image" },
      { path: "status", select: "name type" },
      { path: "location", select: "name" },
      { path: "manufacturer", select: "name" },
      { path: "supplier", select: "name" },
      { path: "department", select: "name" },
      { path: "assigned_to", select: "name email first_name last_name username" },
    ];

    const assets = await AssetModel.find(filter)
      .select("-qr_code -__v")
      .sort({ createdAt: -1 })
      .populate(query)
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Assets fetched successfully",
        data: assets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching assets", error);
    return NextResponse.json(
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
  const authResult = await requirePermission(
    "canDeleteAssets",
    "Only Admins can permanently delete assets."
  );
  if ("error" in authResult) {
    return authResult.error;
  }
  const workspaceId = authResult.actor.workspaceId;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset ID" },
      { status: 400 }
    );
  }

  try {
    const deletedAsset = await AssetModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedAsset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    // Log deletion
    try {
      await ActionLogModel.create({
        userId: workspaceId,
        item_id: deletedAsset._id,
        item_type: "Asset",
        item_name: deletedAsset.asset_name || deletedAsset.asset_tag,
        action_type: "delete",
        notes: "Asset deleted",
      });
    } catch (logErr) {
      console.error("ActionLog error:", logErr);
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Asset deleted successfully",
        deletedAsset,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error deleting asset", "Error deleting asset:");
  }
}
