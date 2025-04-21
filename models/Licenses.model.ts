import mongoose, { Schema, Model, Document } from "mongoose";

export interface License extends Document {
  name: string;
  category: Schema.Types.ObjectId;
  product_key: string;
  company: Schema.Types.ObjectId;
  supplier: Schema.Types.ObjectId;
  manufacturer: Schema.Types.ObjectId;
  license_to_name: string;
  license_to_email: string;
  seats: string;
  expiry_date: Date;
  order_number: string;
  purchase_date: Date;
  termination_date:Date;
  purchase_cost: number;
}
const LicenseSchema: Schema<License> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    product_key: {
      type: String,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Companies",
      required: [true, "Company is required"],
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },
    manufacturer: {
      type: Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: [true, "Manufacturer is required"],
    },
    expiry_date: {
      type: Date,
    },
    seats: {
      type: String,
    },
    license_to_name: {
      type: String,
    },
    license_to_email: {
      type: String,
    },
    order_number: {
      type: String,
    },
    purchase_date: {
      type: Date,
      default: Date.now,
    },
    termination_date: {
      type: Date,
    },
    purchase_cost: {
      type: Number,
    },
  },
  { timestamps: true }
);
export const LicenseModel: Model<License> =
  mongoose.models.Licenses ||
  mongoose.model<License>("Licenses", LicenseSchema);
