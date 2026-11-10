import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";


export interface Manufacturer extends Document{
    userId?:string;
    name:string;
    url:string;
    support_url:string;
    support_phone:string;
    support_email:string;
    assets?:number;
    licenses?:number;
    consumables?:number;
    accessories?:number;
    components?:number;
    image?:string;
}

const ManufacturerSchema:Schema<Manufacturer> = new Schema({
    userId:{
        type:String,
        index:true,
        trim:true
    },
    name:{
        type:String,
        required:true
    },
    url:{
        type:String,
        required:true
    },
    support_url:{
        type:String,
        required:true
    },
    support_phone:{
        type:String,
        required:true
    },
    support_email:{
        type:String,
        required:true
    },
    image:{
        type:String,
        trim:true
    },
    
}, {timestamps:true, toJSON:{virtuals:true},toObject:{virtuals:true}})

ManufacturerSchema.index({ userId: 1, name: 1 }, { unique: true });
ManufacturerSchema.index({ createdAt: -1 });

export const ManufacturerModel: Model<Manufacturer> = defineModel<Manufacturer>(
  "Manufacturer",
  ManufacturerSchema
);