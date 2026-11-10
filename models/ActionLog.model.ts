import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface ActionLog extends Document {
  userId?: string;
  item_id: mongoose.Types.ObjectId;
  item_type: "Asset" | "License" | "Accessory" | "Consumable" | "Component" | "User" | "People";
  item_name?: string;
  action_type: "checkout" | "checkin" | "create" | "update" | "delete" | "audit";
  target_id?: mongoose.Types.ObjectId;
  target_type?: "People" | "Location" | "Asset" | null;
  target_name?: string;
  admin_id?: string;
  admin_name?: string;
  notes?: string;
}

const ActionLogSchema: Schema<ActionLog> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "item_type",
    },
    item_type: {
      type: String,
      required: true,
      enum: ["Asset", "License", "Accessory", "Consumable", "Component", "User", "People"],
    },
    item_name: {
      type: String,
      trim: true,
    },
    action_type: {
      type: String,
      required: true,
      enum: ["checkout", "checkin", "create", "update", "delete", "audit"],
    },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "target_type",
      default: null,
    },
    target_type: {
      type: String,
      enum: ["People", "Location", "Asset", null],
      default: null,
    },
    target_name: {
      type: String,
      trim: true,
    },
    admin_id: {
      type: String,
      trim: true,
    },
    admin_name: {
      type: String,
      trim: true,
      default: "Admin",
    },
    notes: {
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

ActionLogSchema.index({ createdAt: -1 });
ActionLogSchema.index({ item_id: 1, createdAt: -1 });
ActionLogSchema.index({ target_id: 1, createdAt: -1 });
ActionLogSchema.index({ action_type: 1, createdAt: -1 });
ActionLogSchema.index({ item_type: 1, createdAt: -1 });

export const ActionLogModel: Model<ActionLog> = defineModel<ActionLog>(
  "ActionLog",
  ActionLogSchema
);

