import mongoose, { Schema, Document, Model } from "mongoose";

export interface Company extends Document {
  name: string;
  email: string;
}
const CompanySchema: Schema<Company> = new Schema(
  {
     name: { type: String, required: true, unique:true },
     email: { type: String, required: true },
  },
  { timestamps: true,toJSON:{virtuals:true},toObject:{virtuals:true} }
);

export const CompanyModel: Model<Company> =
  mongoose.models.Companies ||
  mongoose.model<Company>("Companies", CompanySchema);
