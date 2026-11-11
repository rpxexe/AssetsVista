import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbconnect from "@/lib/dbconnect";
import { parseReadableError } from "@/lib/errorMessages";
import { getAuthenticatedActor } from "@/lib/serverAuth";
import { ensureMultiTenantIndexes } from "@/lib/userIndexes";
import { SettingsModel } from "@/models/Settings.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { StatusModel } from "@/models/setting/Status.model";

const STANDARD_STATUSES = [
  { name: "Ready to Deploy", type: "deployable", notes: "Available and ready to check out" },
  { name: "Deployed", type: "deployable", notes: "Currently deployed in active use" },
  { name: "CheckedOut", type: "deployable", notes: "Checked out to a user or location" },
  { name: "Pending", type: "pending", notes: "In repair, awaiting parts, or onboarding" },
  { name: "Undeployed", type: "undeployable", notes: "Broken or not currently deployable" },
  { name: "Archived", type: "archived", notes: "Decommissioned or retired equipment" },
  { name: "Requestable", type: "deployable", notes: "Eligible for self-service request" },
];

const STANDARD_CATEGORIES = [
  { name: "Laptops", type: "Asset", email: true },
  { name: "Desktops", type: "Asset", email: true },
  { name: "Monitors", type: "Asset", email: false },
  { name: "Mobile Devices", type: "Asset", email: true },
  { name: "Software Licenses", type: "License", email: true },
  { name: "Keyboards & Mice", type: "Accessory", email: false },
  { name: "Memory & Storage", type: "Component", email: false },
  { name: "Office Consumables", type: "Consumable", email: false },
];

function normalizeMongoUri(rawUri: string, customDbName?: string): string {
  const trimmed = rawUri.trim();
  const cleanDb = (customDbName || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanDb) return trimmed;

  try {
    const parsed = new URL(trimmed);
    parsed.pathname = `/${cleanDb}`;
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function maskMongoHost(rawUri: string): string {
  try {
    const parsed = new URL(rawUri);
    const dbPart = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "/(default)";
    return `${parsed.protocol}//${parsed.host}${dbPart}`;
  } catch {
    return "cluster (host masked)";
  }
}

async function testMongoConnection(uri: string) {
  const started = Date.now();
  const conn = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
    maxPoolSize: 2,
  });

  try {
    await conn.asPromise();
    const db = conn.db;
    if (!db) {
      throw new Error("Connected to server, but no active database handle was returned.");
    }
    await db.admin().command({ ping: 1 });
    const collections = await db.listCollections().toArray();
    const pingMs = Date.now() - started;

    return {
      connected: true,
      pingMs,
      databaseName: db.databaseName,
      collectionsCount: collections.length,
      collections: collections.map((c) => c.name).sort(),
      maskedHost: maskMongoHost(uri),
    };
  } finally {
    await conn.close().catch(() => null);
  }
}

function upsertEnvLine(content: string, key: string, value: string): string {
  const lines = content ? content.split(/\r?\n/) : [];
  const prefix = `${key}=`;
  let updated = false;

  const nextLines = lines.map((line) => {
    if (line.trim().startsWith(prefix)) {
      updated = true;
      return `${key}="${value.replace(/"/g, '\\"')}"`;
    }
    return line;
  });

  if (!updated) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== "") {
      nextLines.push("");
    }
    nextLines.push(`${key}="${value.replace(/"/g, '\\"')}"`);
  }

  return `${nextLines.join("\n").replace(/\n+$/, "")}\n`;
}

async function initializeWorkspaceDefaults(workspaceId: string) {
  await ensureMultiTenantIndexes();

  await Promise.all([
    ...STANDARD_STATUSES.map((st) =>
      StatusModel.findOneAndUpdate(
        { userId: workspaceId, name: st.name },
        { $setOnInsert: { userId: workspaceId, ...st } },
        { upsert: true }
      )
    ),
    ...STANDARD_CATEGORIES.map((cat) =>
      CategoryModel.findOneAndUpdate(
        { userId: workspaceId, name: cat.name },
        { $setOnInsert: { userId: workspaceId, ...cat } },
        { upsert: true }
      )
    ),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (!actor.permissions.canRunSetup) {
      return NextResponse.json(
        {
          success: false,
          message: "Only Admins can test or configure system database settings.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = String(body.action || "").trim();

    if (action === "init-defaults") {
      await dbconnect();
      await initializeWorkspaceDefaults(actor.workspaceId);

      return NextResponse.json(
        {
          success: true,
          message:
            "Workspace indexes verified and standard status labels & categories initialized (inventory tables kept clean).",
        },
        { status: 200 }
      );
    }

    if (action === "complete-setup") {
      await dbconnect();
      const shouldInitDefaults = body.initDefaults !== false;
      if (shouldInitDefaults) {
        await initializeWorkspaceDefaults(actor.workspaceId);
      } else {
        await ensureMultiTenantIndexes();
      }

      const siteName =
        typeof body.siteName === "string" && body.siteName.trim()
          ? body.siteName.trim().slice(0, 80)
          : undefined;
      const defaultCurrency =
        typeof body.defaultCurrency === "string" && body.defaultCurrency.trim()
          ? body.defaultCurrency.trim().slice(0, 8)
          : undefined;
      const currencyCode =
        typeof body.currencyCode === "string" && body.currencyCode.trim()
          ? body.currencyCode.trim().toUpperCase().slice(0, 8)
          : undefined;

      await SettingsModel.findOneAndUpdate(
        { userId: actor.workspaceId },
        {
          $set: {
            setup_completed: true,
            setup_completed_at: new Date(),
            setup_completed_by: actor.dbUser.name || actor.dbUser.email,
            ...(siteName ? { site_name: siteName } : {}),
            ...(defaultCurrency ? { default_currency: defaultCurrency } : {}),
            ...(currencyCode ? { currency_code: currencyCode } : {}),
          },
          $setOnInsert: {
            userId: actor.workspaceId,
          },
        },
        { upsert: true, new: true }
      );

      return NextResponse.json(
        {
          success: true,
          message: shouldInitDefaults
            ? "Workspace setup completed with standard status labels and categories."
            : "Workspace setup marked complete.",
        },
        { status: 200 }
      );
    }

    const rawUri = String(body.mongodbUri || "").trim();
    const dbName = typeof body.dbName === "string" ? body.dbName.trim() : "";

    if (!rawUri) {
      return NextResponse.json(
        { success: false, message: "Please provide a MongoDB connection URI." },
        { status: 400 }
      );
    }

    if (!/^mongodb(\+srv)?:\/\//i.test(rawUri)) {
      return NextResponse.json(
        {
          success: false,
          message: "Connection string must start with mongodb:// or mongodb+srv://",
        },
        { status: 400 }
      );
    }

    const finalUri = normalizeMongoUri(rawUri, dbName);

    if (action === "test") {
      const result = await testMongoConnection(finalUri);
      return NextResponse.json(
        {
          success: true,
          message: `Connected to "${result.databaseName}" in ${result.pingMs}ms`,
          data: result,
        },
        { status: 200 }
      );
    }

    if (action === "save-env") {
      const testResult = await testMongoConnection(finalUri);
      const envPath = path.join(process.cwd(), ".env.local");
      const envLine = `MONGODB_URI="${finalUri}"`;

      // Cloud serverless hosts (e.g. Vercel) use a read-only filesystem at runtime
      const isReadOnlyHost = process.env.VERCEL === "1" || process.env.NETLIFY === "true";

      if (isReadOnlyHost) {
        return NextResponse.json(
          {
            success: true,
            saved: false,
            readOnlyHost: true,
            message:
              "Connection verified! Because this deployment runs on a cloud host, add MONGODB_URI in your host's Environment Variables dashboard and redeploy.",
            data: { ...testResult, envSnippet: `MONGODB_URI=${finalUri}` },
          },
          { status: 200 }
        );
      }

      try {
        const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
        const nextEnv = upsertEnvLine(existing, "MONGODB_URI", finalUri);
        fs.writeFileSync(envPath, nextEnv, "utf8");
        process.env.MONGODB_URI = finalUri;

        return NextResponse.json(
          {
            success: true,
            saved: true,
            readOnlyHost: false,
            message: `Verified connection to "${testResult.databaseName}" (${testResult.pingMs}ms) and saved MONGODB_URI to .env.local. Restart the server to ensure all workers use the updated URI.`,
            data: { ...testResult, envSnippet: envLine },
          },
          { status: 200 }
        );
      } catch {
        return NextResponse.json(
          {
            success: true,
            saved: false,
            readOnlyHost: true,
            message:
              "Connection verified, but .env.local is not writable from this runtime. Copy MONGODB_URI into your environment configuration manually.",
            data: { ...testResult, envSnippet: `MONGODB_URI=${finalUri}` },
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Unsupported setup action." },
      { status: 400 }
    );
  } catch (error) {
    const parsed = parseReadableError(
      error,
      "Could not connect to MongoDB. Check host, username/password URL encoding, and Network Access IP allowlist."
    );
    return NextResponse.json(
      { success: false, message: parsed.message },
      { status: 400 }
    );
  }
}

