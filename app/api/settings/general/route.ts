import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { SettingsModel } from "@/models/Settings.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_FIELDS = new Set([
  "site_name",
  "site_tagline",
  "site_logo",
  "default_currency",
  "currency_code",
  "locale",
  "date_format",
  "timezone",
  "auto_increment_prefix",
  "auto_increment_assets",
  "auto_increment_padding",
  "audit_interval_months",
  "alert_threshold",
  "alert_interval",
  "show_alerts_in_menu",
  "dash_chart_type",
  "default_eula_text",
  "require_eula_acceptance",
  "alert_email",
  "min_password_length",
  "session_max_age_days",
  "allow_self_registration",
  "label_width_mm",
  "label_height_mm",
  "label_show_serial",
  "label_show_model",
  "label_show_company",
]);

export async function GET() {
  try {
    const authResult = await requirePermission(
      "canManageSettings",
      "Only Admins can view and manage system settings."
    );
    if ("error" in authResult) {
      return authResult.error;
    }

    const { actor } = authResult;
    const dbStart = Date.now();
    await dbconnect();

    let dbLatencyMs = Date.now() - dbStart;
    if (mongoose.connection.db) {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().command({ ping: 1 }).catch(() => null);
      dbLatencyMs = Date.now() - pingStart;
    }

    const settings = await SettingsModel.findOneAndUpdate(
      { userId: actor.workspaceId },
      { $setOnInsert: { userId: actor.workspaceId } },
      { upsert: true, new: true }
    ).lean();

    const systemInfo = {
      appVersion: "v0.1.0",
      framework: "Next.js 16 (App Router) · React 19",
      nodeVersion: process.version,
      authProvider: "Built-in Role-Based Auth (Admin, Assets User, Request User)",
      databaseDriver: "MongoDB (Mongoose)",
      databaseName: mongoose.connection.db?.databaseName || "assetsvista",
      dbLatencyMs,
      mailProvider: process.env.RESEND_API_KEY ? "Resend API (Configured)" : "Resend API (Not configured)",
      searchEngine: process.env.ELASTICSEARCH_URL
        ? `Elasticsearch (${process.env.ELASTICSEARCH_URL})`
        : "Built-in Local Search Index",
      timezone: settings?.timezone || "UTC",
      workspaceId: actor.workspaceId,
      adminEmail: actor.dbUser.email,
      authSecretConfigured: Boolean(process.env.AUTH_SECRET || process.env.SESSION_SECRET),
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          settings,
          systemInfo,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to load admin settings.", "Settings GET error:");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authResult = await requirePermission(
      "canManageSettings",
      "Only Admins can update system settings."
    );
    if ("error" in authResult) {
      return authResult.error;
    }

    const { actor } = authResult;
    await dbconnect();
    const body = await req.json();

    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(body || {})) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      sanitized[key] = typeof val === "string" ? val.trim() : val;
    }

    if (typeof sanitized.site_name === "string" && !sanitized.site_name) {
      sanitized.site_name = "AssetsVista";
    }
    if (sanitized.min_password_length !== undefined) {
      sanitized.min_password_length = Math.min(
        32,
        Math.max(6, Number(sanitized.min_password_length) || 6)
      );
    }
    if (sanitized.session_max_age_days !== undefined) {
      sanitized.session_max_age_days = Math.min(
        90,
        Math.max(1, Number(sanitized.session_max_age_days) || 7)
      );
    }
    if (sanitized.auto_increment_padding !== undefined) {
      sanitized.auto_increment_padding = Math.min(
        8,
        Math.max(2, Number(sanitized.auto_increment_padding) || 4)
      );
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid settings fields provided." },
        { status: 400 }
      );
    }

    const updated = await SettingsModel.findOneAndUpdate(
      { userId: actor.workspaceId },
      {
        $set: sanitized,
        $setOnInsert: { userId: actor.workspaceId },
      },
      { upsert: true, new: true }
    ).lean();

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: updated._id,
      item_type: "Settings",
      item_name: body._section || "Admin Settings",
      action_type: "update",
      admin_name: actor.dbUser.name || actor.dbUser.email,
      notes: `Updated ${Object.keys(sanitized).join(", ")}`,
    }).catch(() => null);

    return NextResponse.json(
      {
        success: true,
        message: "Settings saved successfully",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to update settings.", "Settings PUT error:");
  }
}

