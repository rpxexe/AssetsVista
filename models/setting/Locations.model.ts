import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";


export interface Location extends Document{
    userId?:string;
    name:string;
    assigned_assets?:number;
    assigned_accessories?:number;
    currency:string;
    address:string;
    city:string;
    state:string;
    image?:string;
}

const LocationSchema:Schema<Location> = new Schema({
    userId:{
        type:String,
        index:true,
        trim:true
    },
    name:{
        type:String,
        required:true
    }, 
    currency:{
        type:String,
    },
    address:{
        type:String
    },
    city:{
        type:String
    },
    state:{
        type:String
    },
    image:{
        type:String,
        trim:true
    }
},{timestamps:true,toJSON:{virtuals:true},toObject:{virtuals:true}})

LocationSchema.index({ userId: 1, name: 1 });
LocationSchema.index({ createdAt: -1 });
LocationSchema.index({ name: 1 });

export const LocationModel: Model<Location> = defineModel<Location>(
  "Location",
  LocationSchema
);