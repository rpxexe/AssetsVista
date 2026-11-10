import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface Company extends Document {
  userId?: string;
  name: string;
  email: string;
  image?: string;
}
const CompanySchema: Schema<Company> = new Schema(
  {
     userId: { type: String, index: true, trim: true },
     name: { type: String, required: true },
     email: { type: String, required: true },
     image: { type: String, trim: true },
  },
  { timestamps: true,toJSON:{virtuals:true},toObject:{virtuals:true} }
);

CompanySchema.index({ userId: 1, name: 1 }, { unique: true });
CompanySchema.index({ createdAt: -1 });

export const CompanyModel: Model<Company> = defineModel<Company>(
  "Companies",
  CompanySchema
);
