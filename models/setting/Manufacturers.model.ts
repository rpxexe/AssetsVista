import mongoose,{Schema,Model,Document} from "mongoose";


export interface Manufacturer extends Document{
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
}

const ManufacturerSchema:Schema<Manufacturer> = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
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
    
}, {timestamps:true, toJSON:{virtuals:true},toObject:{virtuals:true}})

export const ManufacturerModel:Model<Manufacturer> =(mongoose.models.Manufacturer) || mongoose.model<Manufacturer>("Manufacturer",ManufacturerSchema)