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

    // Parallelize all 4 foreign-key resolutions
    const [company, supplier, manufacturer, category] = await Promise.all([
      resolveEntity(CompanyModel, body.company || body.companyName),
      resolveEntity(SupplierModel, body.supplier || body.supplierName),
      resolveEntity(ManufacturerModel, body.manufacturer || body.manufacturerName),
      resolveEntity(CategoryModel, body.category || body.categoryName),
    ]);

    if (!company) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
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
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 400 }
      );
    }

    const seatsCount = body.seats ? Number(body.seats) : 1;

    const license = new LicenseModel({
      userId: workspaceId,
      name: body.name,
      category: category._id,
      product_key: body.product_key,
      company: company._id,
      supplier: supplier._id,
      manufacturer: manufacturer._id,
      license_to_name: body.license_to_name,
      license_to_email: body.license_to_email,
      seats: seatsCount,
      seats_available: seatsCount,
      expiry_date: body.expiry_date ? new Date(body.expiry_date) : undefined,
      order_number: body.order_number,
      purchase_date: body.purchase_date
        ? new Date(body.purchase_date)
        : new Date(),
      termination_date: body.termination_date
        ? new Date(body.termination_date)
        : undefined,
      purchase_cost: body.purchase_cost ? Number(body.purchase_cost) : 0,
      image: body.image || undefined,
    });

    await license.save();

    await ActionLogModel.create({
      userId: workspaceId,
      item_id: license._id,
      item_type: "License",
      item_name: license.name,
      action_type: "create",
      notes: `License created with ${seatsCount} seat(s)`,
    });

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      {
        success: true,
        message: "License created successfully",
        data: license,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error while creating license.", "Error while creating license:");
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
    const search = searchParams.get("search");

    const filter: Record<string, any> = { userId: workspaceId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { product_key: { $regex: search, $options: "i" } },
        { license_to_name: { $regex: search, $options: "i" } },
      ];
    }

    const query = [
      { path: "company", select: "name" },
      { path: "category", select: "name" },
      { path: "manufacturer", select: "name" },
      { path: "supplier", select: "name" },
    ];

    const licenses = await LicenseModel.find(filter)
      .sort({ createdAt: -1 })
      .populate(query)
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Licenses fetched successfully",
        data: licenses,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching licenses", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error while fetching licenses",
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

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing License ID" },
      { status: 400 }
    );
  }

  try {
    const deletedLicense = await LicenseModel.findOneAndDelete({
      _id: id,
      userId: workspaceId,
    });
    if (!deletedLicense) {
      return NextResponse.json(
        { success: false, message: "License not found" },
        { status: 404 }
      );
    }

    await ActionLogModel.create({
      userId: workspaceId,
      item_id: deletedLicense._id,
      item_type: "License",
      item_name: deletedLicense.name,
      action_type: "delete",
      notes: "License deleted",
    });

    invalidateElasticIndexCache(workspaceId);

    return NextResponse.json(
      { success: true, message: "License deleted successfully", deletedLicense },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Error deleting license.", "Error deleting license:");
  }
}
