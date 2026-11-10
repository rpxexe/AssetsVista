import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface Status extends Document {
  userId?: string;
  name: string;
  type?: "deployable" | "pending" | "undeployable" | "archived";
  notes?: string;
  assets?: number;
}

const StatusSchema: Schema<Status> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Status name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["deployable", "pending", "undeployable", "archived"],
      default: "deployable",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

StatusSchema.index({ userId: 1, name: 1 }, { unique: true });
StatusSchema.index({ createdAt: -1 });

export const StatusModel: Model<Status> = defineModel<Status>(
  "Status",
  StatusSchema
);
