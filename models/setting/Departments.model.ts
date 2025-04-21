import mongoose, { Schema, Document, Model } from "mongoose";

export interface Department extends Document {
  name: string;
  company: Schema.Types.ObjectId;
  phone: string;
  location: Schema.Types.ObjectId;
}
const DepartmentSchema: Schema<Department> = new Schema(
  {
    name: { 
        type: String, 
        required: true ,
        unique:true
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

export const DepartmentModel: Model<Department> = (mongoose.models.Department )|| mongoose.model<Department>(
  "Department",
  DepartmentSchema
);
