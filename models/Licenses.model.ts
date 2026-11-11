import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface License extends Document {
  userId?: string;
  name: string;
  category: mongoose.Types.ObjectId;
  product_key?: string;
  company: mongoose.Types.ObjectId;
  supplier: mongoose.Types.ObjectId;
  manufacturer: mongoose.Types.ObjectId;
  license_to_name?: string;
  license_to_email?: string;
  seats: number;
  seats_available?: number;
  min_amt?: number;
  expiry_date?: Date;
  order_number?: string;
  purchase_date?: Date;
  termination_date?: Date;
  purchase_cost?: number;
  image?: string;
}

const LicenseSchema: Schema<License> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    product_key: {
      type: String,
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Companies",
      required: [true, "Company is required"],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },
    manufacturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: [true, "Manufacturer is required"],
    },
    expiry_date: {
      type: Date,
    },
    seats: {
      type: Number,
      default: 1,
      min: 1,
    },
    seats_available: {
      type: Number,
      default: 1,
    },
    min_amt: {
      type: Number,
      default: 0,
      min: 0,
    },
    license_to_name: {
      type: String,
      trim: true,
    },
    license_to_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    order_number: {
      type: String,
      trim: true,
    },
    purchase_date: {
      type: Date,
      default: Date.now,
    },
    termination_date: {
      type: Date,
    },
    purchase_cost: {
      type: Number,
      default: 0,
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

LicenseSchema.index({ userId: 1, expiry_date: 1 });
LicenseSchema.index({ createdAt: -1 });
LicenseSchema.index({ expiry_date: 1 });
LicenseSchema.index({ license_to_name: 1 });
LicenseSchema.index({ license_to_email: 1 });
LicenseSchema.index({ name: 1 });

export const LicenseModel: Model<License> = defineModel<License>(
  "Licenses",
  LicenseSchema
);
