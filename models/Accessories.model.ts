import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface Accessories extends Document {
  userId?: string;
  name: string;
  category: mongoose.Types.ObjectId;
  model_no?: string;
  location?: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  manufacturer?: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId;
  qty: number;
  min_amt?: number;
  order_number?: string;
  purchase_cost?: number;
  purchase_date?: Date;
  image?: string;
}

const AccessoriesSchema: Schema<Accessories> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Accessory name is required"],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Companies",
      required: [true, "Company is required"],
    },
    manufacturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    model_no: {
      type: String,
      trim: true,
    },
    order_number: {
      type: String,
      trim: true,
    },
    qty: {
      type: Number,
      required: [true, "Quantity is required"],
      default: 0,
    },
    min_amt: {
      type: Number,
      default: 0,
    },
    purchase_cost: {
      type: Number,
      default: 0,
    },
    purchase_date: {
      type: Date,
      default: Date.now,
    },
    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AccessoriesSchema.index({ userId: 1, createdAt: -1 });
AccessoriesSchema.index({ createdAt: -1 });
AccessoriesSchema.index({ name: 1 });
AccessoriesSchema.index({ company: 1 });
AccessoriesSchema.index({ category: 1 });

export const AccessoriesModel: Model<Accessories> = defineModel<Accessories>(
  "Accessories",
  AccessoriesSchema
);
