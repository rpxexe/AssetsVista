import dbconnect from "@/lib/dbconnect";
import { AssetModel } from "@/models/Assets.model";
import { SupplierModel } from "@/models/setting/Suppliers.model";

import { NextRequest, NextResponse } from "next/server";
 export async function POST(req:Request){
    await dbconnect();
    try {
        const {name,address,contact_name,email,phone}= await req.json();
        const supplier = new SupplierModel({ name, address,contact_name, email, phone });
        await supplier.save()
        
        return Response.json({
            success:true,
            message:"Supplier Created Successfully",
           
        },{status:201})
    } catch (error:any) {
        console.error("Error while creating Supplier",error)
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
        return Response.json({
            success:false,
            message:"Error while creating Supplier",
        },{status:500})
    }
 }
 export async function GET(){
    await dbconnect();
    try {
    
    const suppliers = await SupplierModel.find().sort({createdAt:-1})
     const supplierwithassets = await Promise.all(
       suppliers.map(async (supplier) => {
         const assets = await AssetModel.countDocuments({
           supplier: supplier._id,
         });
         return { ...supplier.toObject(), assets };
       })
     );
   
    return Response.json(
      {
        success: true,
        message: "Supplier fetched Successfully",
        data: supplierwithassets,
      },
      { status: 201 }
    );
      } catch (error) {
        console.error("Error while fetching Supplier",error)
        return Response.json({
            success:false,
            message:"Error while fetching Supplier",
        },{status:500})
    }
}
 


export async function DELETE(req: NextRequest) {
  await dbconnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { message: "Missing Supplier ID" },
      { status: 400 }
    );
  }

  try {
    const deletedSupplier = await SupplierModel.findByIdAndDelete(id);
    if (!deletedSupplier) {
      return NextResponse.json(
        { message: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Supplier deleted successfully", deletedSupplier },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error deleting Supplier", error: error.message },
      { status: 500 }
    );
  }
}