import dbconnect from "@/lib/dbconnect";
import { AccessoriesModel } from "@/models/Accessories.model";
import { AssetModel } from "@/models/Assets.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";

export async function GET(){
    await dbconnect();
    try {
        
        const totalAssets=await AssetModel.countDocuments();
        const totalLicenses=await LicenseModel.countDocuments();
        const totalAccessories=await AccessoriesModel.countDocuments();
        const totalConsumables=await ConsumableModel.countDocuments();
        const totalComponents=await ComponentModel.countDocuments();
        return Response.json({
            success:true,
            message:"Total Counts Fetched Successfully",
            data:{"Assets":totalAssets,
            "Licenses":totalLicenses,
            "Accessories":totalAccessories,
            "Consumables":totalConsumables,
            "Components":totalComponents}
        },{status:200})
    } catch (error) {
        console.error("Error while fetching total counts",error);
        return Response.json({
            success:false,
            message:"Error while fetching total counts"
        },{status:500})
    }
}