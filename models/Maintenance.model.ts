import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export type MaintenanceType =
  | "Maintenance"
  | "Repair"
  | "Upgrade"
  | "PAT Test"
  | "Calibration"
  | "Software Support"
  | "Hardware Support";

export interface IMaintenance extends Document {
  userId?: string;
  asset: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  maintenance_type: MaintenanceType;
  title: string;
  is_warranty: boolean;
  start_date: Date;
  expected_completion_date?: Date;
  completed_at?: Date | null;
  cost?: number;
  notes?: string;
}

const MaintenanceSchema: Schema<IMaintenance> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: [true, "Asset is required"],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    maintenance_type: {
      type: String,
      enum: [
        "Maintenance",
        "Repair",
        "Upgrade",
        "PAT Test",
        "Calibration",
        "Software Support",
        "Hardware Support",
      ],
      default: "Maintenance",
    },
    title: {
      type: String,
      required: [true, "Maintenance title is required"],
      trim: true,
    },
    is_warranty: {
      type: Boolean,
      default: false,
    },
    start_date: {
      type: Date,
      default: Date.now,
    },
    expected_completion_date: {
      type: Date,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
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

MaintenanceSchema.index({ userId: 1, createdAt: -1 });
MaintenanceSchema.index({ userId: 1, expected_completion_date: 1, completed_at: 1 });
MaintenanceSchema.index({ userId: 1, asset: 1 });

export const MaintenanceModel: Model<IMaintenance> = defineModel<IMaintenance>(
  "Maintenance",
  MaintenanceSchema
);

