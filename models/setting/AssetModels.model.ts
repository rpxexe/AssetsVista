import mongoose, { Document, Model, Schema } from "mongoose";


export interface Assetmodel extends Document {
  name: string;
  model_no: string;
  assets?: number;
  category: mongoose.Schema.Types.ObjectId; 
  eol_rate: number;
}

const AssetModelSchema: Schema<Assetmodel> = new Schema(
  {
    name: { type: String, required: [true, "name is required"],unique:true },
    model_no: { type: String },
    category: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Category", 
      required: [true, "Category is required"],
    },
    eol_rate: { type: Number },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);



export const AssetModel_Model: Model<Assetmodel> =
  mongoose.models.AssetModel ||
  mongoose.model<Assetmodel>("AssetModel", AssetModelSchema);
