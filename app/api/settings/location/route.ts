import dbconnect from "@/lib/dbconnect";
import { AssetModel } from "@/models/Assets.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { LocationModel } from "@/models/setting/Locations.model";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req:Request){
    await dbconnect();
    try {
        const {name,currency,address,city,state}= await req.json();
        const location= new LocationModel({name,currency,address,city,state})
        await location.save()
         
        return Response.json(
          {
            success: true,
            message: "location created successfully",
      
          },
          { status: 201 }
        );
    } catch (error:any) {
        console.error("Error while creating Location", error);
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
            message: "Error while creating Location",
          },
          { status: 500 }
        );
    }
}
export async function GET(){
    await dbconnect();
    try {
      
        const locations = await LocationModel.find().sort({ createdAt: -1 });
        const locationWithAllData= await Promise.all(
          locations.map(async(location)=>{
            const assets= await AssetModel.countDocuments({location:location._id})
            const department= await DepartmentModel.countDocuments({location:location._id})
            return{...location.toObject(),assets,department}  
          })
        )
          
        return Response.json(
          {
            success: true,
            message: "Location fetched successfully",
            data: locationWithAllData,
          },
          { status: 200 }
        );
    } catch (error) {
        console.error("Error while fetching Location",error)
        return Response.json({
            success:false,
            message:"Error while fetching Location",
        },{status:500})
    }
}


export async function DELETE(req: NextRequest) {
  await dbconnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { message: "Missing Location ID" },
      { status: 400 }
    );
  }

  try {
    const deletedLocation = await LocationModel.findByIdAndDelete(id);
    if (!deletedLocation) {
      return NextResponse.json(
        { message: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Location deleted successfully", deletedLocation },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error deleting Location", error: error.message },
      { status: 500 }
    );
  }
}