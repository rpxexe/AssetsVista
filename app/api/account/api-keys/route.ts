import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbconnect from "@/lib/dbconnect";
import {
  API_KEY_EXPIRATION_OPTIONS,
  ApiKeyExpirationPreset,
  computeExpirationDate,
} from "@/lib/apiKeyFormat";
import { generateApiKeyPair } from "@/lib/apiKeys";
import { requirePermission, requireSessionPermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { ApiKeyModel } from "@/models/ApiKey.model";

const MAX_ACTIVE_KEYS_PER_USER = 50;
const ALLOWED_PRESETS = new Set<string>(
  API_KEY_EXPIRATION_OPTIONS.map((opt) => opt.value)
);

interface RawApiKeyLean {
  _id: { toString(): string };
  name: string;
  notes?: string;
  keyPrefix: string;
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt?: Date;
}

function serializeApiKey(doc: RawApiKeyLean) {
  const now = Date.now();
  const status: "active" | "expired" | "revoked" = doc.revokedAt
    ? "revoked"
    : doc.expiresAt && new Date(doc.expiresAt).getTime() <= now
    ? "expired"
    : "active";

  return {
    _id: doc._id.toString(),
    name: doc.name,
    notes: doc.notes || "",
    keyPrefix: doc.keyPrefix,
    maskedToken: `${doc.keyPrefix}••••••••••••••••`,
    status,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    lastUsedAt: doc.lastUsedAt ? new Date(doc.lastUsedAt).toISOString() : null,
    revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const authResult = await requirePermission(
      "canManageApiKeys",
      "Your role does not permit viewing or managing API keys."
    );
    if ("error" in authResult) return authResult.error;
    const { actor } = authResult;

    await dbconnect();
    const docs = await ApiKeyModel.find({
      userId: new mongoose.Types.ObjectId(actor.userId),
      workspaceId: actor.workspaceId,
    })
      .select("_id name notes keyPrefix expiresAt lastUsedAt revokedAt createdAt")
      .sort({ revokedAt: 1, createdAt: -1 })
      .lean<RawApiKeyLean[]>();

    return NextResponse.json(
      {
        success: true,
        data: {
          keys: docs.map(serializeApiKey),
          ownerEmail: actor.dbUser.email,
          role: actor.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load API keys" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSessionPermission(
      "canManageApiKeys",
      "Your role does not permit creating personal API keys."
    );
    if ("error" in authResult) return authResult.error;
    const { actor } = authResult;

    let body: { name?: unknown; expirationPreset?: unknown; notes?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Token name must be between 2 and 100 characters.",
        },
        { status: 400 }
      );
    }

    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (notes.length > 300) {
      return NextResponse.json(
        {
          success: false,
          message: "Notes must be 300 characters or fewer.",
        },
        { status: 400 }
      );
    }

    const rawPreset =
      typeof body.expirationPreset === "string" ? body.expirationPreset.trim() : "1y";
    if (!ALLOWED_PRESETS.has(rawPreset)) {
      return NextResponse.json(
        { success: false, message: "Unsupported expiration preset." },
        { status: 400 }
      );
    }
    const preset = rawPreset as ApiKeyExpirationPreset;

    await dbconnect();
    const userObjectId = new mongoose.Types.ObjectId(actor.userId);

    const activeCount = await ApiKeyModel.countDocuments({
      userId: userObjectId,
      workspaceId: actor.workspaceId,
      revokedAt: null,
    });

    if (activeCount >= MAX_ACTIVE_KEYS_PER_USER) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum of ${MAX_ACTIVE_KEYS_PER_USER} active API keys reached. Revoke unused keys first.`,
        },
        { status: 400 }
      );
    }

    const { plainTextToken, keyPrefix, tokenHash } = generateApiKeyPair();
    const expiresAt = computeExpirationDate(preset);

    const created = await ApiKeyModel.create({
      userId: userObjectId,
      workspaceId: actor.workspaceId,
      name,
      notes,
      keyPrefix,
      tokenHash,
      expiresAt,
      lastUsedAt: null,
      revokedAt: null,
    });

    await ActionLogModel.create({
      userId: actor.workspaceId,
      item_id: userObjectId,
      item_type: "User",
      item_name: actor.dbUser.name || actor.dbUser.email,
      action_type: "create",
      admin_id: actor.userId,
      admin_name: actor.dbUser.name || actor.dbUser.email,
      notes: `Generated personal API key "${name}" (${keyPrefix}...)`,
    }).catch(() => null);

    return NextResponse.json(
      {
        success: true,
        message: "Personal Access Token generated successfully.",
        data: {
          apiKey: serializeApiKey(created.toObject()),
          plainTextToken,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate API key" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireSessionPermission(
      "canManageApiKeys",
      "Your role does not permit revoking personal API keys."
    );
    if ("error" in authResult) return authResult.error;
    const { actor } = authResult;

    const searchParams = req.nextUrl.searchParams;
    let keyId = searchParams.get("id")?.trim() || "";
    let purge = searchParams.get("purge") === "1" || searchParams.get("purge") === "true";

    if (!keyId) {
      try {
        const body = await req.json();
        if (typeof body?.id === "string") keyId = body.id.trim();
        if (body?.purge === true) purge = true;
      } catch {
        // Ignore empty DELETE body when id comes from query string
      }
    }

    if (!keyId || !mongoose.Types.ObjectId.isValid(keyId)) {
      return NextResponse.json(
        { success: false, message: "Valid API key ID is required." },
        { status: 400 }
      );
    }

    await dbconnect();
    const userObjectId = new mongoose.Types.ObjectId(actor.userId);
    const existing = await ApiKeyModel.findOne({
      _id: new mongoose.Types.ObjectId(keyId),
      userId: userObjectId,
      workspaceId: actor.workspaceId,
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "API key not found." },
        { status: 404 }
      );
    }

    if (purge && existing.revokedAt) {
      await ApiKeyModel.deleteOne({ _id: existing._id });
      return NextResponse.json(
        {
          success: true,
          message: "Revoked API key record removed.",
          data: { deleted: true, id: keyId },
        },
        { status: 200 }
      );
    }

    if (!existing.revokedAt) {
      existing.revokedAt = new Date();
      await existing.save();

      await ActionLogModel.create({
        userId: actor.workspaceId,
        item_id: userObjectId,
        item_type: "User",
        item_name: actor.dbUser.name || actor.dbUser.email,
        action_type: "delete",
        admin_id: actor.userId,
        admin_name: actor.dbUser.name || actor.dbUser.email,
        notes: `Revoked personal API key "${existing.name}" (${existing.keyPrefix}...)`,
      }).catch(() => null);
    }

    return NextResponse.json(
      {
        success: true,
        message: `API key "${existing.name}" has been revoked.`,
        data: { revoked: true, apiKey: serializeApiKey(existing.toObject()) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to revoke API key:", error);
    return NextResponse.json(
      { success: false, message: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}

