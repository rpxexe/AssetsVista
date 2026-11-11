import dbconnect from "@/lib/dbconnect";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateElasticIndexCache } from "@/lib/elasticSearch";
import { requirePermission } from "@/lib/serverAuth";
import { ActionLogModel } from "@/models/ActionLog.model";
import { AssetModel } from "@/models/Assets.model";
import { SettingsModel } from "@/models/Settings.model";
import { LocationModel } from "@/models/setting/Locations.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePermission(
      "canAuditAssets",
      "Only Admin or Assets User roles can perform Scanner Bulk Audit."
    );
    if ("error" in authResult) {
      return authResult.error;
    }
    const workspaceId = authResult.actor.workspaceId;
    const adminName = authResult.actor.dbUser.name || authResult.actor.dbUser.email;

    await dbconnect();
    const body = await req.json();

    const rawIdentifiers: unknown[] = Array.isArray(body.identifiers) ? body.identifiers : [];
    const identifiers = Array.from(
      new Set(rawIdentifiers.map((v) => String(v || "").trim()).filter(Boolean))
    );

    if (identifiers.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please scan or enter at least one Asset Tag or Serial Number." },
        { status: 400 }
      );
    }

    const locationId =
      body.locationId && mongoose.Types.ObjectId.isValid(String(body.locationId))
        ? String(body.locationId)
        : undefined;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    const [settings, verifiedLocation] = await Promise.all([
      SettingsModel.findOne({ userId: workspaceId })
        .select("audit_interval_months")
        .lean<{ audit_interval_months?: number } | null>(),
      locationId
        ? LocationModel.findOne({ _id: locationId, userId: workspaceId })
            .select("_id name")
            .lean<{ _id: mongoose.Types.ObjectId; name: string } | null>()
        : Promise.resolve(null),
    ]);

    const intervalMonths = Math.max(
      1,
      Number(body.auditIntervalMonths || settings?.audit_interval_months || 12)
    );
    const now = new Date();
    const nextAuditDate = new Date(now);
    nextAuditDate.setMonth(nextAuditDate.getMonth() + intervalMonths);

    const orClauses: Array<Record<string, unknown>> = [];
    for (const token of identifiers) {
      const rx = new RegExp(`^${escapeRegex(token)}$`, "i");
      orClauses.push({ asset_tag: rx }, { serial_number: rx });
      if (mongoose.Types.ObjectId.isValid(token)) {
        orClauses.push({ _id: token });
      }
    }

    const matchedAssets = await AssetModel.find({
      userId: workspaceId,
      $or: orClauses,
    })
      .populate([{ path: "location", select: "name" }, { path: "status", select: "name" }])
      .lean<Array<Record<string, any>>>();

    const assetByToken = new Map<string, Record<string, any>>();
    for (const asset of matchedAssets) {
      if (asset.asset_tag) assetByToken.set(String(asset.asset_tag).toLowerCase(), asset);
      if (asset.serial_number) assetByToken.set(String(asset.serial_number).toLowerCase(), asset);
      assetByToken.set(String(asset._id).toLowerCase(), asset);
    }

    const matchedIds: mongoose.Types.ObjectId[] = [];
    const seenIds = new Set<string>();
    const audited: Array<Record<string, any>> = [];
    const notFound: string[] = [];

    for (const token of identifiers) {
      const hit = assetByToken.get(token.toLowerCase());
      if (!hit) {
        notFound.push(token);
        continue;
      }
      const idStr = String(hit._id);
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        matchedIds.push(new mongoose.Types.ObjectId(idStr));
        audited.push({
          _id: idStr,
          identifier: token,
          asset_tag: hit.asset_tag,
          asset_name: hit.asset_name,
          status: hit.status?.name || "-",
          previousLocation: hit.location?.name || "-",
          newLocation: verifiedLocation?.name || hit.location?.name || "-",
          previousAuditDate: hit.last_audit_date || null,
          nextAuditDate: nextAuditDate.toISOString(),
        });
      }
    }

    if (matchedIds.length > 0) {
      await AssetModel.updateMany(
        { _id: { $in: matchedIds }, userId: workspaceId },
        {
          $set: {
            last_audit_date: now,
            next_audit_date: nextAuditDate,
            ...(verifiedLocation?._id ? { location: verifiedLocation._id } : {}),
          },
        }
      );

      await ActionLogModel.insertMany(
        matchedAssets
          .filter((a) => seenIds.has(String(a._id)))
          .map((asset) => ({
            userId: workspaceId,
            action_type: "audit" as const,
            item_type: "Asset" as const,
            item_id: asset._id,
            item_name: asset.asset_tag
              ? `${asset.asset_tag}${asset.asset_name ? ` (${asset.asset_name})` : ""}`
              : asset.asset_name,
            target_type: asset.assigned_type || undefined,
            target_id: asset.assigned_to || undefined,
            admin_name: adminName,
            notes: notes || "Verified via Scanner Bulk Audit",
          }))
      ).catch(() => null);

      invalidateElasticIndexCache(workspaceId);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          matchedIds.length > 0
            ? `Audited ${matchedIds.length} asset(s)${notFound.length ? ` (${notFound.length} not found)` : ""}.`
            : `No matching active assets found for the scanned tag(s).`,
        data: {
          auditedCount: matchedIds.length,
          notFoundCount: notFound.length,
          intervalMonths,
          nextAuditDate: nextAuditDate.toISOString(),
          audited,
          notFound,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return apiErrorResponse(error, "Scanner bulk audit failed.", "Bulk audit POST error:");
  }
}

