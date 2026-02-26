
import { StatusModel } from "@/models/setting/Status.model";
import dbconnect from "@/lib/dbconnect";

import { AssetModel } from "@/models/Assets.model";
import { NextRequest, NextResponse } from "next/server";




export async function POST(req: Request) {

  await dbconnect();
  try {
    const { name } = await req.json();
    const status = new StatusModel({ name });
    await status.save();


    return Response.json(
      {
        success: true,
        message: "Status created successfully",

      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error while creating status", error);
    const mongoError = error as { code?: number; keyValue?: Record<string, string> };
    if (mongoError.code === 11000) {
      const key = Object.keys(mongoError.keyValue ?? {})[0]
      const value = mongoError.keyValue?.[key]
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
        message: "Error while creating status",
      },
      { status: 500 }
    );
  }
}
export async function GET() {
  await dbconnect();
  try {

    const statuses = await StatusModel.find().sort({ createdAt: -1 });
    const statuswithassets = await Promise.all(
      statuses.map(async (status) => {
        const assets = await AssetModel.countDocuments({
          status: status._id,
        });
        return { ...status.toObject(), assets };
      })
    );
    return Response.json(
      {
        success: true,
        message: "Status Fetched successfully",
        data: statuswithassets,
      },
      { status: 201 }
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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { message: "Missing Status ID" },
      { status: 400 }
    );
  }

  try {
    const deletedSatus = await StatusModel.findByIdAndDelete(id);
    if (!deletedSatus) {
      return NextResponse.json(
        { message: "Status not found" },
        { status: 404 }
      );
    }

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