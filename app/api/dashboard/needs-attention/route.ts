import { apiErrorResponse } from "@/lib/apiError";
import dbconnect from "@/lib/dbconnect";
import { getAuthenticatedActor } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { CheckoutAcceptanceModel } from "@/models/CheckoutAcceptance.model";
import { CheckoutRequestModel } from "@/models/CheckoutRequest.model";
import { LicenseModel } from "@/models/Licenses.model";
import { MaintenanceModel } from "@/models/Maintenance.model";
import { PeopleModel } from "@/models/Peoples.model";
import { SettingsModel } from "@/models/Settings.model";
import { NextResponse } from "next/server";

const OFFBOARDING_DAYS = 30;

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const scope = { userId: actor.workspaceId };

    const settings = await SettingsModel.findOne(scope)
      .select("alert_interval")
      .lean<{ alert_interval?: number } | null>();

    const alertIntervalDays = Math.max(1, Number(settings?.alert_interval || 30));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const licenseWindow = new Date(todayStart);
    licenseWindow.setDate(licenseWindow.getDate() + alertIntervalDays);
    licenseWindow.setHours(23, 59, 59, 999);

    const offboardingWindow = new Date(todayStart);
    offboardingWindow.setDate(offboardingWindow.getDate() + OFFBOARDING_DAYS);
    offboardingWindow.setHours(23, 59, 59, 999);

    const [
      overdueAudits,
      overdueCheckins,
      unacceptedAcceptances,
      pendingRequests,
      assetsPastEol,
      overdueMaintenances,
      licensesExpiringSoon,
      offboardingPeople,
      assignedAssetPeopleIds,
      assignedLicenseEmails,
    ] = await Promise.all([
      AssetModel.countDocuments({ ...scope, next_audit_date: { $lt: todayStart } }),
      AssetModel.countDocuments({
        ...scope,
        assigned_to: { $ne: null },
        expected_checkin_date: { $lt: todayStart },
      }),
      CheckoutAcceptanceModel.countDocuments({ ...scope, status: "pending" }),
      CheckoutRequestModel.countDocuments({ ...scope, status: "pending" }),
      AssetModel.countDocuments({ ...scope, eol_date: { $lt: todayStart } }),
      MaintenanceModel.countDocuments({
        ...scope,
        completed_at: null,
        expected_completion_date: { $lt: todayStart },
      }),
      LicenseModel.countDocuments({
        ...scope,
        expiry_date: { $gte: todayStart, $lte: licenseWindow },
      }),
      PeopleModel.find({
        ...scope,
        end_date: { $gte: todayStart, $lte: offboardingWindow },
      })
        .select("_id email")
        .lean<Array<{ _id: any; email?: string }>>(),
      AssetModel.distinct("assigned_to", {
        ...scope,
        assigned_to: { $ne: null },
      }),
      LicenseModel.distinct("license_to_email", {
        ...scope,
        license_to_email: { $nin: [null, ""] },
      }),
    ]);

    const assignedPeopleSet = new Set(
      (assignedAssetPeopleIds || []).map((id: any) => id?.toString()).filter(Boolean)
    );
    const assignedEmailSet = new Set(
      (assignedLicenseEmails || [])
        .map((e: string) => String(e || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const employeesOffboardingSoon = offboardingPeople.filter((p) => {
      const hasAsset = assignedPeopleSet.has(p._id.toString());
      const hasLicense = p.email ? assignedEmailSet.has(p.email.trim().toLowerCase()) : false;
      return hasAsset || hasLicense;
    }).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          overdueAudits,
          overdueCheckins,
          unacceptedAcceptances,
          pendingRequests,
          assetsPastEol,
          overdueMaintenances,
          licensesExpiringSoon,
          employeesOffboardingSoon,
          alertIntervalDays,
          offboardingDays: OFFBOARDING_DAYS,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error fetching Needs Attention metrics.", "Needs attention error:");
  }
}

