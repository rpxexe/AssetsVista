import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { LicenseModel } from "@/models/Licenses.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await dbconnect();
  const { id } = await context.params;

  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing license ID" },
      { status: 400 }
    );
  }

  try {
    const query = [
      { path: "company", select: "name" },
      { path: "category", select: "name" },
      { path: "manufacturer", select: "name" },
      { path: "supplier", select: "name" },
    ];

    const license = await LicenseModel.findOne({ _id: id, userId: workspaceId })
      .populate(query)
      .lean();

    if (!license) {
      return NextResponse.json(
        { success: false, message: "License not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, message: "License fetched successfully", data: license },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching license:", error);
    return NextResponse.json(
      { success: false, message: "Error while fetching license" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbconnect();
  const { id } = await context.params;

  const workspaceId = await getWorkspaceUserId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing License ID" },
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

    const [comp, cat, sup, mfr] = await Promise.all([
      (data.company || data.companyName) ? resolveEntity(CompanyModel, data.company || data.companyName) : null,
      (data.category || data.categoryName) ? resolveEntity(CategoryModel, data.category || data.categoryName) : null,
      (data.supplier || data.supplierName) ? resolveEntity(SupplierModel, data.supplier || data.supplierName) : null,
      (data.manufacturer || data.manufacturerName) ? resolveEntity(ManufacturerModel, data.manufacturer || data.manufacturerName) : null,
    ]);

    const updateFields: Record<string, any> = {};

    if (comp) updateFields.company = comp._id;
    if (cat) updateFields.category = cat._id;
    if (sup) updateFields.supplier = sup._id;
    if (mfr) updateFields.manufacturer = mfr._id;

    if (data.name !== undefined) updateFields.name = data.name;
    if (data.product_key !== undefined) updateFields.product_key = data.product_key;
    if (data.license_to_name !== undefined) updateFields.license_to_name = data.license_to_name;
    if (data.license_to_email !== undefined) updateFields.license_to_email = data.license_to_email;
    if (data.seats !== undefined) {
      updateFields.seats = Number(data.seats) || 1;
    }
    if (data.seats_available !== undefined) {
      updateFields.seats_available = Number(data.seats_available);
    }
    if (data.order_number !== undefined) updateFields.order_number = data.order_number;
    if (data.purchase_date !== undefined) updateFields.purchase_date = new Date(data.purchase_date);
    if (data.expiry_date !== undefined) updateFields.expiry_date = data.expiry_date ? new Date(data.expiry_date) : undefined;
    if (data.termination_date !== undefined) updateFields.termination_date = data.termination_date ? new Date(data.termination_date) : undefined;
    if (data.purchase_cost !== undefined) updateFields.purchase_cost = Number(data.purchase_cost);
    if (data.image !== undefined) updateFields.image = data.image;

    const updatedLicense = await LicenseModel.findOneAndUpdate(
      { _id: id, userId: workspaceId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedLicense) {
      return NextResponse.json(
        { success: false, message: "License not found" },
        { status: 404 }
      );
    }

    await ActionLogModel.create({
      userId: workspaceId,
      item_id: id,
      item_type: "License",
      item_name: updatedLicense.name,
      action_type: "update",
      notes: "License updated",
    });

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "License updated successfully",
        data: updatedLicense,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while updating License.", "Error while updating License:");
  }
}
