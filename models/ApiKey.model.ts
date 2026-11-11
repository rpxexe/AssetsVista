import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface IApiKey extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: string;
  name: string;
  notes?: string;
  keyPrefix: string;
  tokenHash: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workspaceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ApiKeySchema.index({ userId: 1, workspaceId: 1, createdAt: -1 });
ApiKeySchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export const ApiKeyModel: Model<IApiKey> = defineModel<IApiKey>(
  "ApiKey",
  ApiKeySchema
);

export default ApiKeyModel;

