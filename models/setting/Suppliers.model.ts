import mongoose, { Document, Model, Schema } from 'mongoose';

export interface Supplier extends Document{
    userId?: string;
    name:string;
    address:string;
    contact_name:string;
    email:string;
    phone:string;
    assets?:number;
    accessories?:number;
    licenses?:number;
    components?:number;
    consumables?:number;
}
const SupplierSchema: Schema<Supplier> = new Schema(
  {
    userId: { type: String, index: true },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    contact_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    
  },
  { timestamps: true, toJSON:{virtuals:true}, toObject:{virtuals:true} }
);

export const SupplierModel:Model<Supplier> = (mongoose.models.Supplier) || mongoose.model<Supplier>("Supplier",SupplierSchema)