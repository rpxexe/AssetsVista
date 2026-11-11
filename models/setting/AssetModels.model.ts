import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";


export interface Assetmodel extends Document {
  userId?: string;
  name: string;
  model_no: string;
  assets?: number;
  category: mongoose.Schema.Types.ObjectId; 
  eol_rate: number;
  min_amt?: number;
  image?: string;
}

const AssetModelSchema: Schema<Assetmodel> = new Schema(
  {
    userId: { type: String, index: true, trim: true },
    name: { type: String, required: [true, "name is required"] },
    model_no: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Category", 
      required: [true, "Category is required"],
    },
    eol_rate: { type: Number },
    min_amt: { type: Number, default: 0, min: 0 },
    image: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AssetModelSchema.index({ userId: 1, name: 1 }, { unique: true });
AssetModelSchema.index({ createdAt: -1 });

export const AssetModel_Model: Model<Assetmodel> = defineModel<Assetmodel>(
  "AssetModel",
  AssetModelSchema
);
