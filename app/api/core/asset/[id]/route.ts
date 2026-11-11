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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbconnect();

  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset ID" },
      { status: 400 }
    );
  }

  try {
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

    const asset = await AssetModel.findOne({ _id: id, userId: workspaceId })
      .populate(query)
      .lean();

    if (!asset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Asset fetched successfully", data: asset },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching asset", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching asset" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbconnect();

  const authResult = await requirePermission(
    "canCreateEditAssets",
    "Only Admin or Assets User roles can modify assets."
  );
  if ("error" in authResult) {
    return authResult.error;
  }
  const workspaceId = authResult.actor.workspaceId;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing asset ID" },
      { status: 400 }
    );
  }

  try {
    const data = await req.json();

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

    // Parallelize asset existence, 7 entity resolutions, and duplicate check
    const [
      existingAsset,
      comp,
      am,
      st,
      loc,
      sup,
      mfr,
      dept,
      duplicate,
    ] = await Promise.all([
      AssetModel.findOne({ _id: id, userId: workspaceId }).select("_id").lean(),
      (data.company || data.companyName) ? resolveEntity(CompanyModel, data.company || data.companyName) : null,
      (data.asset_model || data.assetModelName || data.assetModel) ? resolveEntity(AssetModel_Model, data.asset_model || data.assetModelName || data.assetModel) : null,
      (data.status || data.statusName) ? resolveEntity(StatusModel, data.status || data.statusName) : null,
      (data.location || data.locationName) ? resolveEntity(LocationModel, data.location || data.locationName) : null,
      (data.supplier || data.supplierName) ? resolveEntity(SupplierModel, data.supplier || data.supplierName) : null,
      (data.manufacturer || data.manufacturerName) ? resolveEntity(ManufacturerModel, data.manufacturer || data.manufacturerName) : null,
      (data.department || data.departmentName) ? resolveEntity(DepartmentModel, data.department || data.departmentName) : null,
      (data.asset_tag || data.serial_number)
        ? AssetModel.findOne({
            userId: workspaceId,
            _id: { $ne: id },
            $or: [
              ...(data.asset_tag ? [{ asset_tag: data.asset_tag }] : []),
              ...(data.serial_number ? [{ serial_number: data.serial_number }] : []),
            ],
          }).select("asset_tag serial_number").lean()
        : null,
    ]);

    if (!existingAsset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            duplicate.asset_tag === data.asset_tag
              ? `Asset Tag '${data.asset_tag}' already exists on another asset`
              : `Serial Number '${data.serial_number}' already exists on another asset`,
        },
        { status: 409 }
      );
    }

    const updateFields: Record<string, any> = {};

    // Relations
    if (comp) updateFields.company = comp._id;
    if (am) updateFields.asset_model = am._id;
    if (st) updateFields.status = st._id;
    if (loc) updateFields.location = loc._id;
    if (sup) updateFields.supplier = sup._id;
    if (mfr) updateFields.manufacturer = mfr._id;
    if (dept) updateFields.department = dept._id;

    // Direct fields
    if (data.asset_tag !== undefined) updateFields.asset_tag = data.asset_tag;
    if (data.serial_number !== undefined) updateFields.serial_number = data.serial_number;
    if (data.asset_name !== undefined) updateFields.asset_name = data.asset_name;
    if (data.warranty !== undefined) updateFields.warranty = Number(data.warranty);
    if (data.order_number !== undefined) updateFields.order_number = data.order_number;
    if (data.purchase_date !== undefined) updateFields.purchase_date = new Date(data.purchase_date);
    if (data.eol_date !== undefined) updateFields.eol_date = data.eol_date ? new Date(data.eol_date) : undefined;
    if (data.purchase_cost !== undefined) updateFields.purchase_cost = Number(data.purchase_cost);
    if (data.notes !== undefined) updateFields.notes = data.notes;
    if (data.image !== undefined) updateFields.image = data.image;

    const updatedAsset = await AssetModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    // Log update
    try {
      await ActionLogModel.create({
        userId: workspaceId,
        item_id: id,
        item_type: "Asset",
        item_name: updatedAsset?.asset_name || updatedAsset?.asset_tag,
        action_type: "update",
        notes: "Asset updated",
      });
    } catch (logErr) {
      console.error("ActionLog error:", logErr);
    }

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "Asset updated successfully",
        asset: updatedAsset,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while updating asset", "Error while updating asset:");
  }
}
