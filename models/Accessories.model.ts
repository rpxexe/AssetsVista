import mongoose, { Document, Model, Schema } from "mongoose";

export interface Accessories extends Document{
    name:string;
    accessory_category:mongoose.Types.ObjectId;
    model_no:string;
    location:mongoose.Types.ObjectId,
    supplier:mongoose.Types.ObjectId,   
    company:mongoose.Types.ObjectId,
    qty:number,
    purchase_cost:number,
    purchase_date:Date,



}
const AccessoriesSchema:Schema<Accessories>=new Schema({},{timestamps:true})
export const AccessoriesModel:Model<Accessories>= (mongoose.models.Accessories) || mongoose.model<Accessories>("Accessories",AccessoriesSchema)