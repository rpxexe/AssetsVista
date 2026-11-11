import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface Component extends Document {
  userId?: string;
  name: string;
  category: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId;
  location?: mongoose.Types.ObjectId;
  manufacturer?: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  serial_number?: string;
  order_number?: string;
  purchase_date?: Date;
  purchase_cost?: number;
  qty: number;
  min_amt?: number;
  image?: string;
}

const ComponentSchema: Schema<Component> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Component name is required"],
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
    serial_number: {
      type: String,
      trim: true,
    },
    order_number: {
      type: String,
      trim: true,
    },
    purchase_date: {
      type: Date,
      default: Date.now,
    },
    purchase_cost: {
      type: Number,
      default: 0,
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

ComponentSchema.index({ userId: 1, createdAt: -1 });
ComponentSchema.index({ createdAt: -1 });
ComponentSchema.index({ name: 1 });
ComponentSchema.index({ company: 1 });
ComponentSchema.index({ category: 1 });

export const ComponentModel: Model<Component> = defineModel<Component>(
  "Component",
  ComponentSchema
);
