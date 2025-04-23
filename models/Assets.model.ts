import mongoose, { Document, Model, Schema } from 'mongoose';

export interface Asset extends Document {
  company: mongoose.Schema.Types.ObjectId;
  asset_tag: string;
  serial_number: string;
  asset_model: mongoose.Schema.Types.ObjectId;
  status: mongoose.Schema.Types.ObjectId;
  location: mongoose.Schema.Types.ObjectId;
  manufacturer: mongoose.Schema.Types.ObjectId;
  department:mongoose.Schema.Types.ObjectId;
  asset_name: string;
  warranty: number;
  order_number: string;
  purchase_date: Date;
  eol_date: Date;
  supplier: mongoose.Schema.Types.ObjectId;
  purchase_cost: number;
}
const AssetSchema: Schema<Asset> = new Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Companies",
      required: true,
    },
    asset_tag: {
      type: String,
      required: true,
      
    },
    serial_number: {
      type: String,
      required: true,
      unique: true,
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
    },
    warranty: {
      type: Number,
    },
    order_number: {
      type: String,
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
    },
  },
  { timestamps: true }
);


export const AssetModel:Model<Asset>= (mongoose.models.Asset)  || mongoose.model<Asset>('Asset',AssetSchema)
