import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export type UserRole = "superadmin" | "admin" | "manager" | "user";

export interface IUser extends Document {
  clerkId?: string;
  auth0Id?: string;
  workspaceId?: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  picture?: string;
  role: UserRole;
  isActive: boolean;
  personId?: mongoose.Types.ObjectId;
  emailVerified?: boolean;
  lastLogin?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    clerkId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    auth0Id: {
      type: String,
      trim: true,
    },
    workspaceId: {
      type: String,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    first_name: {
      type: String,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    picture: String,
    role: {
      type: String,
      enum: ["superadmin", "admin", "manager", "user"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "People",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

UserSchema.index({ createdAt: -1 });
UserSchema.index({ personId: 1 });
UserSchema.index({ role: 1 });

const UserModel: Model<IUser> = defineModel<IUser>("User", UserSchema);

export default UserModel;
