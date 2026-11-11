import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface IImportJob extends Document {
  userId: string;
  actorId: string;
  actorName: string;
  filename: string;
  fileFormat: "csv" | "xlsx" | "xls";
  entityType: string;
  updateExisting: boolean;
  preserveBlanks: boolean;
  autoCreateTaxonomy: boolean;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  autoCreatedTaxonomy: string[];
  errorsPreview: Array<{
    rowNumber: number;
    identifier?: string;
    message: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>(
  {
    userId: { type: String, required: true, index: true, trim: true },
    actorId: { type: String, required: true, trim: true },
    actorName: { type: String, required: true, trim: true },
    filename: { type: String, required: true, trim: true },
    fileFormat: {
      type: String,
      enum: ["csv", "xlsx", "xls"],
      default: "csv",
    },
    entityType: { type: String, required: true, trim: true },
    updateExisting: { type: Boolean, default: true },
    preserveBlanks: { type: Boolean, default: true },
    autoCreateTaxonomy: { type: Boolean, default: true },
    totalRows: { type: Number, default: 0 },
    createdCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    autoCreatedTaxonomy: [{ type: String }],
    errorsPreview: [
      {
        rowNumber: Number,
        identifier: String,
        message: String,
      },
    ],
  },
  { timestamps: true }
);

ImportJobSchema.index({ userId: 1, createdAt: -1 });

export const ImportJobModel: Model<IImportJob> = defineModel<IImportJob>(
  "ImportJob",
  ImportJobSchema
);

export default ImportJobModel;

