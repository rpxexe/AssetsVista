import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface ILoginAttempt extends Document {
  workspaceId?: string;
  userId?: string;
  email: string;
  role?: string;
  action: "login" | "register";
  success: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const LoginAttemptSchema: Schema<ILoginAttempt> = new Schema(
  {
    workspaceId: {
      type: String,
      index: true,
      trim: true,
    },
    userId: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      enum: ["login", "register"],
      default: "login",
    },
    success: {
      type: Boolean,
      required: true,
      default: false,
    },
    reason: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LoginAttemptSchema.index({ workspaceId: 1, createdAt: -1 });

export const LoginAttemptModel: Model<ILoginAttempt> = defineModel<ILoginAttempt>(
  "LoginAttempt",
  LoginAttemptSchema
);

