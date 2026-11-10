import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface SystemSettings extends Document {
  userId?: string;
  site_name: string;
  default_currency: string;
  currency_code: string;
  locale: string;
  auto_increment_prefix: string;
  auto_increment_assets: boolean;
  audit_interval_months: number;
  default_eula_text: string;
  alert_email?: string;
  setup_completed: boolean;
  setup_completed_at?: Date;
  setup_completed_by?: string;
}

const SettingsSchema: Schema<SystemSettings> = new Schema(
  {
    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    site_name: {
      type: String,
      required: true,
      default: "AssetsVista",
      trim: true,
    },
    default_currency: {
      type: String,
      default: "$",
      trim: true,
    },
    currency_code: {
      type: String,
      default: "USD",
      trim: true,
    },
    locale: {
      type: String,
      default: "en-US",
      trim: true,
    },
    auto_increment_prefix: {
      type: String,
      default: "AST-",
      trim: true,
    },
    auto_increment_assets: {
      type: Boolean,
      default: true,
    },
    audit_interval_months: {
      type: Number,
      default: 12,
      min: 1,
    },
    default_eula_text: {
      type: String,
      default:
        "I acknowledge receipt of the company-owned equipment listed above in good working order. I agree to take reasonable care of these assets and return them upon termination of employment or upon request by IT.",
    },
    alert_email: {
      type: String,
      trim: true,
    },
    setup_completed: {
      type: Boolean,
      default: false,
    },
    setup_completed_at: {
      type: Date,
    },
    setup_completed_by: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SettingsModel: Model<SystemSettings> = defineModel<SystemSettings>(
  "Settings",
  SettingsSchema
);

