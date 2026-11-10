import mongoose, { Document, Model, Schema } from 'mongoose';
import { defineModel } from "@/lib/defineModel";

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
    image?:string;
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
    image: {
      type: String,
      trim: true,
    },
    
  },
  { timestamps: true, toJSON:{virtuals:true}, toObject:{virtuals:true} }
);

SupplierSchema.index({ createdAt: -1 });
SupplierSchema.index({ name: 1 });

export const SupplierModel: Model<Supplier> = defineModel<Supplier>(
  "Supplier",
  SupplierSchema
);