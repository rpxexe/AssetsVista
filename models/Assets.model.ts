import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface Asset extends Document {
  userId?: string;
  company: mongoose.Types.ObjectId;
  asset_tag: string;
  serial_number: string;
  asset_model: mongoose.Types.ObjectId;
  status: mongoose.Types.ObjectId;
  location: mongoose.Types.ObjectId;
  manufacturer: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  supplier: mongoose.Types.ObjectId;
  asset_name?: string;
  warranty?: number;
  order_number?: string;
  purchase_date?: Date;
  eol_date?: Date;
  purchase_cost?: number;

  // Checkout / Checkin & Lifecycle fields (Snipe-IT pattern)
  assigned_to?: mongoose.Types.ObjectId;
  assigned_type?: "People" | "Location" | "Asset" | null;
  checkout_date?: Date;
  expected_checkin_date?: Date;
  last_audit_date?: Date;
  next_audit_date?: Date;
  notes?: string;
  image?: string;
  qr_code?: string;
}

const AssetSchema: Schema<Asset> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Companies",
      required: true,
    },
    asset_tag: {
      type: String,
      required: true,
      trim: true,
    },
    serial_number: {
      type: String,
      required: true,
      trim: true,
    },
    asset_model: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssetModel",
      required: true,
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Status",
      required: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    manufacturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    asset_name: {
      type: String,
      trim: true,
    },
    warranty: {
      type: Number,
      default: 0,
    },
    order_number: {
      type: String,
      trim: true,
    },
    purchase_date: {
      type: Date,
      default: Date.now,
    },
    eol_date: {
      type: Date,
    },
    purchase_cost: {
      type: Number,
      default: 0,
    },

    // Check-out / Check-in & Lifecycle (Snipe-IT pattern)
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "assigned_type",
      default: null,
    },
    assigned_type: {
      type: String,
      enum: ["People", "Location", "Asset", null],
      default: null,
    },
    checkout_date: {
      type: Date,
      default: null,
    },
    expected_checkin_date: {
      type: Date,
      default: null,
    },
    last_audit_date: {
      type: Date,
      default: null,
    },
    next_audit_date: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    qr_code: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// High-performance compound & query indexes
AssetSchema.index({ userId: 1, createdAt: -1 });
AssetSchema.index({ userId: 1, asset_tag: 1 }, { unique: true });
AssetSchema.index({ userId: 1, serial_number: 1 }, { unique: true });
AssetSchema.index({ createdAt: -1 });
AssetSchema.index({ assigned_to: 1, createdAt: -1 });
AssetSchema.index({ status: 1, createdAt: -1 });
AssetSchema.index({ company: 1 });
AssetSchema.index({ location: 1 });
AssetSchema.index({ department: 1 });
AssetSchema.index({ next_audit_date: 1 });
AssetSchema.index({ last_audit_date: 1 });
AssetSchema.index({ expected_checkin_date: 1 });
AssetSchema.index({ asset_name: 1 });

export const AssetModel: Model<Asset> = defineModel<Asset>("Asset", AssetSchema);
