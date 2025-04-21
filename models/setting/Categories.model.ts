import mongoose, { Schema, Document, Model } from "mongoose";

export interface Category extends Document {
  name: string;
  type: string;
  qty?: number;
  email: boolean;
}

const CategorySchema: Schema<Category> = new Schema(
  {
    name: { type: String, required: [true, "Name is required"],unique:true },
    type: { type: String, required: [true, "Type is required"] },
    email: { type: Boolean, required: [true, "Email is required"] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


export const CategoryModel: Model<Category> =
  mongoose.models.Category ||
  mongoose.model<Category>("Category", CategorySchema);
