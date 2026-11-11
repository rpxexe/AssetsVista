import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export type RequestStatus = "pending" | "fulfilled" | "canceled";
export type RequestableItemType =
  | "Asset"
  | "AssetModel"
  | "Accessory"
  | "Consumable"
  | "Component"
  | "License";

export interface ICheckoutRequest extends Document {
  userId?: string;
  requester?: mongoose.Types.ObjectId;
  requester_name: string;
  requester_email?: string;
  item_type: RequestableItemType;
  item_id: mongoose.Types.ObjectId;
  item_name: string;
  item_tag?: string;
  quantity: number;
  status: RequestStatus;
  notes?: string;
  fulfilled_at?: Date | null;
  canceled_at?: Date | null;
}

const CheckoutRequestSchema: Schema<ICheckoutRequest> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "People",
    },
    requester_name: {
      type: String,
      required: true,
      trim: true,
    },
    requester_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    item_type: {
      type: String,
      enum: ["Asset", "AssetModel", "Accessory", "Consumable", "Component", "License"],
      required: true,
      default: "Asset",
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    item_name: {
      type: String,
      required: true,
      trim: true,
    },
    item_tag: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ["pending", "fulfilled", "canceled"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
    },
    fulfilled_at: {
      type: Date,
      default: null,
    },
    canceled_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CheckoutRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
CheckoutRequestSchema.index({ userId: 1, requester: 1 });

export const CheckoutRequestModel: Model<ICheckoutRequest> =
  defineModel<ICheckoutRequest>("CheckoutRequest", CheckoutRequestSchema);

