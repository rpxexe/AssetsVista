import mongoose, { Document, Model, Schema } from "mongoose";
export interface Status extends Document {
  name: string;
  assets?:number;
}
const StatusSchema: Schema<Status> = new Schema(
  {
    name: {
      type: String,
      required: true,
      enum: [
        "Available",
        "CheckedOut",
        "Deployed",
        "Ready to Deploy",
        "Pending",
        "Un-deployed",
        "BYOD",
        "Archived",
        "Requestable",
        "Due for Audit",
        "Due for Checkin",
      ],
      unique: true,
      default: "Available",
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const StatusModel: Model<Status> = (mongoose.models.Status) ||
  mongoose.model<Status>("Status",StatusSchema);
