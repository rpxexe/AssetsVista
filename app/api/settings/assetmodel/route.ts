import dbconnect from "@/lib/dbconnect";
import { AssetModel } from "@/models/Assets.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  await dbconnect();
  try {
    const { name, model_no, categoryName, eol_rate } = await req.json();

    const categoryExists = await CategoryModel.findOne({ name: categoryName });
    if (!categoryExists) {
      return Response.json(
        {
          success: false,
          message: "Category does not exist",
        },
        { status: 404 }
      );
    }

    const assetModel = new AssetModel_Model({
      name,
      model_no,
      category: categoryExists._id,
      eol_rate,
    });

    await assetModel.save();

    return Response.json(
      {
        success: true,
        message: "Asset model created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error while creating asset model", error);
    const mongoError = error as { code?: number; keyValue?: Record<string, string> };
    if (mongoError.code === 11000) {
      const key = Object.keys(mongoError.keyValue ?? {})[0];
      const value = mongoError.keyValue?.[key];
      return Response.json(
        {
          success: false,
          message: `${value} is already Added`,
        },
        { status: 500 }
      );
    }
    return Response.json(
      {
        success: false,
        message: "Error while creating asset model",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  await dbconnect();
  try {
    const query = [
      {
        path: "category",
        select: "name",
      },
    ];
    const assetModels = await AssetModel_Model.find()
      .sort({ createdAt: -1 })
      .populate(query)
      .lean();
    const assetModelswithassets = await Promise.all(
      assetModels.map(async (assetmodel) => {
        const assets = await AssetModel.countDocuments({
          asset_model: assetmodel._id,
        });
        return { ...assetmodel, assets };
      })
    );

    return Response.json(
      {
        success: true,
        message: "Asset models fetched successfully",
        data: assetModelswithassets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching asset models", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching asset models",
      },
      { status: 500 }
    );
  }
}
export async function DELETE(req: NextRequest) {
  await dbconnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "Missing Asset Model ID" }, { status: 400 });
  }

  try {
    const deletedAsset_Model = await AssetModel_Model.findByIdAndDelete(id);
    if (!deletedAsset_Model) {
      return NextResponse.json({ message: "Asset Model not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Asset Model deleted successfully", deletedAsset_Model },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: "Error deleting asset Model", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}



