import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface People extends Document {
  userId?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  phone?: string;
  username: string;
  department?: mongoose.Types.ObjectId;
  location?: mongoose.Types.ObjectId;
  company?: mongoose.Types.ObjectId;
  employee_num?: string;
  start_date?: Date;
  end_date?: Date;
  notes?: string;
  image?: string;
}

const PeopleSchema: Schema<People> = new Schema(
  {
    userId: {
      type: String,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
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
    title: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Companies",
    },
    employee_num: {
      type: String,
      trim: true,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    image: {
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

PeopleSchema.index({ userId: 1, createdAt: -1 });
PeopleSchema.index({ userId: 1, username: 1 }, { unique: true });
PeopleSchema.index({ userId: 1, end_date: 1 });
PeopleSchema.index({ createdAt: -1 });
PeopleSchema.index({ name: 1 });
PeopleSchema.index({ email: 1 });
PeopleSchema.index({ department: 1 });
PeopleSchema.index({ location: 1 });
PeopleSchema.index({ company: 1 });

export const PeopleModel: Model<People> = defineModel<People>(
  "People",
  PeopleSchema
);
