import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface Department extends Document {
  userId?: string;
  name: string;
  company: Schema.Types.ObjectId;
  phone: string;
  location: Schema.Types.ObjectId;
}
const DepartmentSchema: Schema<Department> = new Schema(
  {
    userId: { type: String, index: true, trim: true },
    name: { 
        type: String, 
        required: true
    },
    company:{
      type:Schema.Types.ObjectId,
      ref:'Companies',
      requied:true,
    },

    phone: { 
        type: String, 
    },
   

    location:{
      type:Schema.Types.ObjectId,
      ref:'Location',
      required:true

    }
  
  },
  { timestamps: true }
);

DepartmentSchema.index({ userId: 1, name: 1 }, { unique: true });
DepartmentSchema.index({ createdAt: -1 });

export const DepartmentModel: Model<Department> = defineModel<Department>(
  "Department",
  DepartmentSchema
);
