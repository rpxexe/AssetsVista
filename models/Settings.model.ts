import mongoose, { Document, Model, Schema } from "mongoose";
import { defineModel } from "@/lib/defineModel";

export interface SystemSettings extends Document {
  userId?: string;
  site_name: string;
  site_tagline?: string;
  site_logo?: string;
  default_currency: string;
  currency_code: string;
  locale: string;
  date_format: string;
  timezone: string;
  auto_increment_prefix: string;
  auto_increment_assets: boolean;
  auto_increment_padding: number;
  audit_interval_months: number;
  alert_threshold: number;
  alert_interval: number;
  show_alerts_in_menu: boolean;
  dash_chart_type: "name" | "type";
  default_eula_text: string;
  require_eula_acceptance: boolean;
  alert_email?: string;
  min_password_length: number;
  session_max_age_days: number;
  allow_self_registration: boolean;
  label_width_mm: number;
  label_height_mm: number;
  label_show_serial: boolean;
  label_show_model: boolean;
  label_show_company: boolean;
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
    site_tagline: {
      type: String,
      default: "Enterprise IT Asset Management",
      trim: true,
    },
    site_logo: {
      type: String,
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
    date_format: {
      type: String,
      default: "MMM d, yyyy",
      trim: true,
    },
    timezone: {
      type: String,
      default: "UTC",
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
    auto_increment_padding: {
      type: Number,
      default: 4,
      min: 2,
      max: 8,
    },
    audit_interval_months: {
      type: Number,
      default: 12,
      min: 1,
    },
    alert_threshold: {
      type: Number,
      default: 0,
      min: 0,
    },
    alert_interval: {
      type: Number,
      default: 30,
      min: 1,
    },
    show_alerts_in_menu: {
      type: Boolean,
      default: true,
    },
    dash_chart_type: {
      type: String,
      enum: ["name", "type"],
      default: "name",
    },
    default_eula_text: {
      type: String,
      default:
        "I acknowledge receipt of the company-owned equipment listed above in good working order. I agree to take reasonable care of these assets and return them upon termination of employment or upon request by IT.",
    },
    require_eula_acceptance: {
      type: Boolean,
      default: true,
    },
    alert_email: {
      type: String,
      trim: true,
    },
    min_password_length: {
      type: Number,
      default: 6,
      min: 6,
      max: 32,
    },
    session_max_age_days: {
      type: Number,
      default: 7,
      min: 1,
      max: 90,
    },
    allow_self_registration: {
      type: Boolean,
      default: true,
    },
    label_width_mm: {
      type: Number,
      default: 62,
      min: 20,
      max: 200,
    },
    label_height_mm: {
      type: Number,
      default: 29,
      min: 15,
      max: 150,
    },
    label_show_serial: {
      type: Boolean,
      default: true,
    },
    label_show_model: {
      type: Boolean,
      default: true,
    },
    label_show_company: {
      type: Boolean,
      default: true,
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
