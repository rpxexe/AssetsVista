import dbconnect from "@/lib/dbconnect";
import { AssetModel } from "@/models/Assets.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { NextRequest, NextResponse } from "next/server";
 

export async function POST(req: Request) {
  await dbconnect();
  try {
    const {  name,
    url,
    support_url,
    support_phone,
    support_email} = await req.json();
    const manufacturer = new ManufacturerModel({
      name,
      url,
      support_url,
      support_phone,
      support_email,
    });
    await manufacturer.save();
     
    
    return Response.json(
      {
        success: true,
        message: "Manufacturer created successfully",
       
      },
      { status: 201 }
    );
  } catch (error:any) {
    console.error("Error while creating manufacturer", error);
    if (error.code === 11000) {
      const key = Object.keys(error.keyValue)[0];
      const value = error.keyValue[key];
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
        message: "Error while creating manufacturer",
      },
      { status: 500 }
    );
  }
}
export async function GET() {
  await dbconnect();
  try {
     const manufacturers = await ManufacturerModel.find().sort({
       createdAt: -1,
     });
      const manufacturerswithassets = await Promise.all(
        manufacturers.map(async (manufacturer) => {
          const assets = await AssetModel.countDocuments({
            manufacturer: manufacturer._id,
          });
          return { ...manufacturer.toObject(), assets };
        })
      );
    return Response.json(
      {
        success: true,
        message: "manufacturer fetched successfully",
        data: manufacturerswithassets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error while fetching manufacturer", error);
    return Response.json(
      {
        success: false,
        message: "Error while fetching manufacturer",
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
      { message: "Missing Manufacturer ID" },
      { status: 400 }
    );
  }

  try {
    const deletedManfacturer = await ManufacturerModel.findByIdAndDelete(id);
    if (!deletedManfacturer) {
      return NextResponse.json(
        { message: "Manufacturer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Manufacturer deleted successfully", deletedManfacturer },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error deleting Manufacturer", error: error.message },
      { status: 500 }
    );
  }
}