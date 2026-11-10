import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface Consumable extends Document {
  userId?: string;
  name: string;
  category: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId;
  location?: mongoose.Types.ObjectId;
  manufacturer?: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  item_no?: string;
  order_number?: string;
  purchase_date?: Date;
  purchase_cost?: number;
  qty: number;
  min_amt?: number;
  image?: string;
}

const ConsumableSchema: Schema<Consumable> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Consumable name is required"],
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
    item_no: {
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

ConsumableSchema.index({ createdAt: -1 });
ConsumableSchema.index({ name: 1 });
ConsumableSchema.index({ company: 1 });
ConsumableSchema.index({ category: 1 });

export const ConsumableModel: Model<Consumable> = defineModel<Consumable>(
  "Consumable",
  ConsumableSchema
);
