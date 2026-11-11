import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId, requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { CheckoutRequestModel } from "@/models/CheckoutRequest.model";
import { MaintenanceModel } from "@/models/Maintenance.model";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
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
    const includeDetails = req.nextUrl.searchParams.get("details") === "1";

    // Ensure ref schemas are loaded for populate() on serverless cold starts
    void [CategoryModel, PeopleModel];

    const query = includeDetails
      ? [
          { path: "company", select: "name" },
          {
            path: "asset_model",
            select: "name model_no image eol_rate min_amt category",
            populate: { path: "category", select: "name type" },
          },
          { path: "status", select: "name type notes" },
          { path: "location", select: "name address city state currency image" },
          {
            path: "manufacturer",
            select: "name url support_url support_email support_phone image",
          },
          {
            path: "supplier",
            select: "name contact_name email phone address image",
          },
          { path: "department", select: "name phone" },
          {
            path: "assigned_to",
            select:
              "name email first_name last_name username phone title employee_num asset_tag asset_name image",
          },
        ]
      : [
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
      .lean<Record<string, any> | null>();

    if (!asset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    if (!includeDetails) {
      return NextResponse.json(
        { success: true, message: "Asset fetched successfully", data: asset },
        { status: 200 }
      );
    }

    const assetModelId = asset.asset_model?._id;
    const [maintenances, activityLogs, acceptances, requests, settings, sameModelCount] =
      await Promise.all([
        MaintenanceModel.find({ userId: workspaceId, asset: id })
          .populate("supplier", "name")
          .sort({ start_date: -1, createdAt: -1 })
          .lean(),
        ActionLogModel.find({
          userId: workspaceId,
          $or: [{ item_id: id }, { target_id: id }],
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        CheckoutAcceptanceModel.find({ userId: workspaceId, checkoutable_id: id })
          .populate("assigned_to", "name first_name last_name email username")
          .sort({ createdAt: -1 })
          .lean(),
        CheckoutRequestModel.find({ userId: workspaceId, item_type: "Asset", item_id: id })
          .populate("requester", "name first_name last_name email username")
          .sort({ createdAt: -1 })
          .lean(),
        SettingsModel.findOne({ userId: workspaceId })
          .select(
            "site_name default_currency currency_code audit_interval_months label_width_mm label_height_mm label_show_serial label_show_model label_show_company"
          )
          .lean(),
        assetModelId
          ? AssetModel.countDocuments({ userId: workspaceId, asset_model: assetModelId })
          : Promise.resolve(0),
      ]);

    const now = new Date();
    const purchaseCost = Number(asset.purchase_cost) || 0;
    const purchaseDate = asset.purchase_date
      ? new Date(asset.purchase_date)
      : new Date(asset.createdAt || now);
    const eolDate = asset.eol_date ? new Date(asset.eol_date) : null;
    const modelEolRate = Number(asset.asset_model?.eol_rate) || 0;
    const warrantyMonths = Number(asset.warranty) || 0;

    // Useful life in months: explicit EOL span > model EOL rate > warranty months > 36m default
    const eolSpanMonths =
      eolDate && eolDate.getTime() > purchaseDate.getTime()
        ? Math.max(
            1,
            (eolDate.getFullYear() - purchaseDate.getFullYear()) * 12 +
              (eolDate.getMonth() - purchaseDate.getMonth())
          )
        : 0;
    const usefulLifeMonths =
      eolSpanMonths > 0
        ? eolSpanMonths
        : modelEolRate > 0
        ? modelEolRate
        : warrantyMonths > 0
        ? warrantyMonths >= 6
          ? warrantyMonths
          : warrantyMonths * 12
        : 36;

    const monthsElapsed = Math.max(
      0,
      (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (now.getMonth() - purchaseDate.getMonth())
    );
    const clampedElapsed = Math.min(usefulLifeMonths, monthsElapsed);
    const monthlyDepreciation =
      usefulLifeMonths > 0 ? Number((purchaseCost / usefulLifeMonths).toFixed(2)) : 0;
    const depreciatedAmount =
      monthsElapsed >= usefulLifeMonths
        ? purchaseCost
        : Math.min(purchaseCost, Number(((purchaseCost / usefulLifeMonths) * monthsElapsed).toFixed(2)));
    const currentValue = Math.max(0, Number((purchaseCost - depreciatedAmount).toFixed(2)));
    const percentDepreciated =
      purchaseCost > 0
        ? Math.min(100, Math.round((depreciatedAmount / purchaseCost) * 100))
        : Math.min(100, Math.round((clampedElapsed / usefulLifeMonths) * 100));

    const fullyDepreciatedDate = new Date(purchaseDate);
    fullyDepreciatedDate.setMonth(fullyDepreciatedDate.getMonth() + usefulLifeMonths);

    let eolPercent = 0;
    let eolDaysRemaining: number | null = null;
    let isPastEol = false;
    if (eolDate) {
      const totalMs = Math.max(1, eolDate.getTime() - purchaseDate.getTime());
      const elapsedMs = Math.max(0, now.getTime() - purchaseDate.getTime());
      eolPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
      eolDaysRemaining = Math.ceil((eolDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      isPastEol = eolDate.getTime() < now.getTime();
    }

    let warrantyExpiryDate: Date | null = null;
    if (warrantyMonths > 0) {
      warrantyExpiryDate = new Date(purchaseDate);
      warrantyExpiryDate.setMonth(warrantyExpiryDate.getMonth() + warrantyMonths);
    }
    const isWarrantyActive = Boolean(warrantyExpiryDate && warrantyExpiryDate.getTime() >= now.getTime());

    let maintenanceCostTotal = 0;
    let warrantyMaintenanceCost = 0;
    let activeMaintenances = 0;
    let completedMaintenances = 0;
    for (const m of maintenances as any[]) {
      const mCost = Number(m.cost) || 0;
      maintenanceCostTotal += mCost;
      if (m.is_warranty) warrantyMaintenanceCost += mCost;
      if (m.completed_at) completedMaintenances += 1;
      else activeMaintenances += 1;
    }

    const totalCostOfOwnership = Number((purchaseCost + maintenanceCostTotal).toFixed(2));
    const checkoutsCount = (activityLogs as any[]).filter((l) => l.action_type === "checkout").length;
    const checkinsCount = (activityLogs as any[]).filter((l) => l.action_type === "checkin").length;
    const auditsCount = (activityLogs as any[]).filter((l) => l.action_type === "audit").length;
    const pendingAcceptances = (acceptances as any[]).filter((a) => a.status === "pending").length;
    const pendingRequests = (requests as any[]).filter((r) => r.status === "pending").length;

    const nextAuditDate = asset.next_audit_date ? new Date(asset.next_audit_date) : null;
    const isAuditOverdue = Boolean(nextAuditDate && nextAuditDate.getTime() < now.getTime());
    const expectedCheckinDate = asset.expected_checkin_date
      ? new Date(asset.expected_checkin_date)
      : null;
    const isCheckinOverdue = Boolean(
      asset.assigned_to && expectedCheckinDate && expectedCheckinDate.getTime() < now.getTime()
    );

    return NextResponse.json(
      {
        success: true,
        message: "Asset fetched successfully",
        data: {
          ...asset,
          details: {
            maintenances,
            activityLogs,
            acceptances,
            requests,
            sameModelCount,
            settings: settings || {
              site_name: "AssetsVista",
              default_currency: "$",
              currency_code: "USD",
              audit_interval_months: 12,
              label_width_mm: 50,
              label_height_mm: 25,
              label_show_serial: true,
              label_show_model: true,
              label_show_company: true,
            },
            metrics: {
              depreciation: {
                purchaseCost,
                currentValue,
                depreciatedAmount,
                monthlyDepreciation,
                percentDepreciated,
                usefulLifeMonths,
                monthsElapsed: clampedElapsed,
                fullyDepreciatedDate: fullyDepreciatedDate.toISOString(),
              },
              eol: {
                eolDate: eolDate ? eolDate.toISOString() : null,
                eolPercent,
                eolDaysRemaining,
                isPastEol,
                totalMonths: eolSpanMonths || usefulLifeMonths,
                monthsElapsed: clampedElapsed,
              },
              warranty: {
                warrantyMonths,
                warrantyExpiryDate: warrantyExpiryDate ? warrantyExpiryDate.toISOString() : null,
                isWarrantyActive,
              },
              tco: {
                purchaseCost,
                maintenanceCostTotal: Number(maintenanceCostTotal.toFixed(2)),
                warrantyMaintenanceCost: Number(warrantyMaintenanceCost.toFixed(2)),
                outOfWarrantyMaintenanceCost: Number(
                  Math.max(0, maintenanceCostTotal - warrantyMaintenanceCost).toFixed(2)
                ),
                totalCostOfOwnership,
              },
              audit: {
                lastAuditDate: asset.last_audit_date ? new Date(asset.last_audit_date).toISOString() : null,
                nextAuditDate: nextAuditDate ? nextAuditDate.toISOString() : null,
                isAuditOverdue,
                isCheckinOverdue,
              },
              counts: {
                activeMaintenances,
                completedMaintenances,
                totalMaintenances: maintenances.length,
                checkoutsCount,
                checkinsCount,
                auditsCount,
                activityCount: activityLogs.length,
                pendingAcceptances,
                totalAcceptances: acceptances.length,
                pendingRequests,
                totalRequests: requests.length,
              },
            },
          },
        },
      },
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
          })
            .setOptions({ includeDeleted: true } as any)
            .select("asset_tag serial_number deletedAt")
            .lean<{ asset_tag: string; serial_number: string; deletedAt?: Date | null } | null>()
        : null,
    ]);

    if (!existingAsset) {
      return NextResponse.json(
        { success: false, message: "Asset not found" },
        { status: 404 }
      );
    }

    if (duplicate) {
      const trashNote = duplicate.deletedAt
        ? " (in Deleted Trash — restore or purge first)"
        : "";
      return NextResponse.json(
        {
          success: false,
          message:
            duplicate.asset_tag === data.asset_tag
              ? `Asset Tag '${data.asset_tag}' already exists on another asset${trashNote}`
              : `Serial Number '${data.serial_number}' already exists on another asset${trashNote}`,
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
