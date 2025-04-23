import mongoose, { Document, Model, Schema } from "mongoose";


export interface Location extends Document{
    name:string;
    assigned_assets?:number;
    assigned_accessories?:number;
    currency:string;
    address:string;
    city:string;
    state:string;
}

const LocationSchema:Schema<Location> = new Schema({
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
    }
},{timestamps:true,toJSON:{virtuals:true},toObject:{virtuals:true}})

export const LocationModel:Model<Location> = (mongoose.models.Location) || mongoose.model<Location>("Location",LocationSchema)