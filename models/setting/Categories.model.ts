import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface Category extends Document {
  userId?: string;
  name: string;
  type: string;
  qty?: number;
  email: boolean;
}

const CategorySchema: Schema<Category> = new Schema(
  {
    userId: { type: String, index: true, trim: true },
    name: { type: String, required: [true, "Name is required"] },
    type: { type: String, required: [true, "Type is required"] },
    email: { type: Boolean, required: [true, "Email is required"] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });
CategorySchema.index({ createdAt: -1 });

export const CategoryModel: Model<Category> = defineModel<Category>(
  "Category",
  CategorySchema
);
