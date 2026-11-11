import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export type AcceptanceStatus = "pending" | "accepted" | "declined";
export type CheckoutableType =
  | "Asset"
  | "License"
  | "Accessory"
  | "Component"
  | "Consumable";

export interface ICheckoutAcceptance extends Document {
  userId?: string;
  checkoutable_type: CheckoutableType;
  checkoutable_id: mongoose.Types.ObjectId;
  item_name: string;
  item_tag?: string;
  assigned_to: mongoose.Types.ObjectId;
  assigned_name?: string;
  status: AcceptanceStatus;
  signature?: string;
  note?: string;
  accepted_at?: Date | null;
  declined_at?: Date | null;
  created_by?: string;
}

const CheckoutAcceptanceSchema: Schema<ICheckoutAcceptance> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    checkoutable_type: {
      type: String,
      enum: ["Asset", "License", "Accessory", "Component", "Consumable"],
      required: true,
      default: "Asset",
    },
    checkoutable_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "checkoutable_type",
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
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "People",
      required: true,
    },
    assigned_name: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    signature: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    accepted_at: {
      type: Date,
      default: null,
    },
    declined_at: {
      type: Date,
      default: null,
    },
    created_by: {
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

CheckoutAcceptanceSchema.index({ userId: 1, status: 1, createdAt: -1 });
CheckoutAcceptanceSchema.index({ userId: 1, checkoutable_id: 1 });

export const CheckoutAcceptanceModel: Model<ICheckoutAcceptance> =
  defineModel<ICheckoutAcceptance>("CheckoutAcceptance", CheckoutAcceptanceSchema);

