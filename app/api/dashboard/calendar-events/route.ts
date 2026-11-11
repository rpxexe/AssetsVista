import { apiErrorResponse } from "@/lib/apiError";
import dbconnect from "@/lib/dbconnect";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
import { LicenseModel } from "@/models/Licenses.model";
import { MaintenanceModel } from "@/models/Maintenance.model";
import { PeopleModel } from "@/models/Peoples.model";
import { NextRequest, NextResponse } from "next/server";

export type CalendarEventType =
  | "maintenance.start"
  | "asset.audit_due"
  | "asset.expected_checkin"
  | "asset.eol"
  | "asset.warranty_expiration"
  | "license.expiration"
  | "license.termination"
  | "user.start_date"
  | "user.end_date";

export interface DashboardCalendarEvent {
  id: string;
  title: string;
  eventType: CalendarEventType;
  categoryLabel: string;
  start: string;
  end?: string;
  allDay: boolean;
  href: string;
  completed?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await dbconnect();
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultEnd.getDate() + 7);

    const rangeStart = searchParams.get("start")
      ? new Date(searchParams.get("start")!)
      : defaultStart;
    const rangeEnd = searchParams.get("end")
      ? new Date(searchParams.get("end")!)
      : defaultEnd;

    const typesParam = (searchParams.get("types") || "").trim();
    const typeFilter = typesParam
      ? new Set(typesParam.split(",").map((t) => t.trim()).filter(Boolean))
      : null;

    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 500);
    const scope = { userId: workspaceId };

    const [maintenances, assets, licenses, people] = await Promise.all([
      MaintenanceModel.find(scope)
        .select("title maintenance_type start_date expected_completion_date completed_at asset")
        .populate("asset", "asset_tag asset_name")
        .lean<Array<any>>(),
      AssetModel.find({
        ...scope,
        $or: [
          { next_audit_date: { $ne: null } },
          { expected_checkin_date: { $ne: null } },
          { eol_date: { $ne: null } },
          { warranty: { $gt: 0 } },
        ],
      })
        .select(
          "asset_tag asset_name asset_model next_audit_date expected_checkin_date eol_date purchase_date warranty"
        )
        .populate("asset_model", "name")
        .lean<Array<any>>(),
      LicenseModel.find({
        ...scope,
        $or: [{ expiry_date: { $ne: null } }, { termination_date: { $ne: null } }],
      })
        .select("name expiry_date termination_date")
        .lean<Array<any>>(),
      PeopleModel.find({
        ...scope,
        $or: [{ start_date: { $ne: null } }, { end_date: { $ne: null } }],
      })
        .select("name first_name last_name start_date end_date")
        .lean<Array<any>>(),
    ]);

    const allEvents: DashboardCalendarEvent[] = [];

    const inHalfOpenRange = (start: Date, end?: Date) => {
      const s = start.getTime();
      const e = end ? end.getTime() : s;
      const rs = rangeStart.getTime();
      const re = rangeEnd.getTime();
      return (
        (s >= rs && s < re) ||
        (e >= rs && e < re) ||
        (s < rs && e >= rs)
      );
    };

    const pushIfMatched = (ev: DashboardCalendarEvent, startDate: Date, endDate?: Date) => {
      if (typeFilter && !typeFilter.has(ev.eventType)) return;
      if (!inHalfOpenRange(startDate, endDate)) return;
      allEvents.push(ev);
    };

    for (const m of maintenances) {
      if (!m.start_date) continue;
      const startDate = new Date(m.start_date);
      const endDate = m.expected_completion_date ? new Date(m.expected_completion_date) : undefined;
      const assetLabel = m.asset
        ? `#${m.asset.asset_tag || ""}${m.asset.asset_name ? ` - ${m.asset.asset_name}` : ""}`
        : "";
      pushIfMatched(
        {
          id: `maint-${m._id}`,
          title: `Maintenance: ${m.title}${assetLabel ? ` (${assetLabel})` : ""}`,
          eventType: "maintenance.start",
          categoryLabel: m.maintenance_type || "Maintenance",
          start: startDate.toISOString(),
          end: endDate?.toISOString(),
          allDay: true,
          href: "/maintenances",
          completed: Boolean(m.completed_at),
        },
        startDate,
        endDate
      );
    }

    for (const a of assets) {
      const modelSuffix = a.asset_model?.name || a.asset_name || "";
      const tagPrefix = a.asset_tag ? `#${a.asset_tag}` : "";
      const label = [tagPrefix, modelSuffix].filter(Boolean).join(" - ");
      const assetHref = a._id
        ? `/assets/view/${a._id}`
        : a.asset_tag
        ? `/assets/listall?search=${encodeURIComponent(a.asset_tag)}`
        : "/assets/listall";

      if (a.next_audit_date) {
        const d = new Date(a.next_audit_date);
        pushIfMatched(
          {
            id: `audit-${a._id}`,
            title: `Audit due: ${label}`,
            eventType: "asset.audit_due",
            categoryLabel: "Audit Due",
            start: d.toISOString(),
            allDay: true,
            href: assetHref,
          },
          d
        );
      }

      if (a.expected_checkin_date) {
        const d = new Date(a.expected_checkin_date);
        pushIfMatched(
          {
            id: `checkin-${a._id}`,
            title: `Expected check-in: ${label}`,
            eventType: "asset.expected_checkin",
            categoryLabel: "Check-in Due",
            start: d.toISOString(),
            allDay: true,
            href: assetHref,
          },
          d
        );
      }

      if (a.eol_date) {
        const d = new Date(a.eol_date);
        pushIfMatched(
          {
            id: `eol-${a._id}`,
            title: `Asset EOL: ${label}`,
            eventType: "asset.eol",
            categoryLabel: "End of Life",
            start: d.toISOString(),
            allDay: true,
            href: assetHref,
          },
          d
        );
      }

      if (a.purchase_date && Number(a.warranty) > 0) {
        const w = new Date(a.purchase_date);
        w.setMonth(w.getMonth() + Number(a.warranty));
        pushIfMatched(
          {
            id: `warranty-${a._id}`,
            title: `Warranty expires: ${label}`,
            eventType: "asset.warranty_expiration",
            categoryLabel: "Warranty",
            start: w.toISOString(),
            allDay: true,
            href: assetHref,
          },
          w
        );
      }
    }

    for (const lic of licenses) {
      const licHref = `/licenses?search=${encodeURIComponent(lic.name)}`;
      if (lic.expiry_date) {
        const d = new Date(lic.expiry_date);
        pushIfMatched(
          {
            id: `lic-exp-${lic._id}`,
            title: `License expires: ${lic.name}`,
            eventType: "license.expiration",
            categoryLabel: "License Expiry",
            start: d.toISOString(),
            allDay: true,
            href: licHref,
          },
          d
        );
      }
      if (lic.termination_date) {
        const d = new Date(lic.termination_date);
        pushIfMatched(
          {
            id: `lic-term-${lic._id}`,
            title: `License terminates: ${lic.name}`,
            eventType: "license.termination",
            categoryLabel: "License Termination",
            start: d.toISOString(),
            allDay: true,
            href: licHref,
          },
          d
        );
      }
    }

    for (const p of people) {
      const pName = p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Employee";
      const pHref = `/people/${p._id}`;
      if (p.start_date) {
        const d = new Date(p.start_date);
        pushIfMatched(
          {
            id: `user-start-${p._id}`,
            title: `Onboarding: ${pName}`,
            eventType: "user.start_date",
            categoryLabel: "Start Date",
            start: d.toISOString(),
            allDay: true,
            href: pHref,
          },
          d
        );
      }
      if (p.end_date) {
        const d = new Date(p.end_date);
        pushIfMatched(
          {
            id: `user-end-${p._id}`,
            title: `Offboarding: ${pName}`,
            eventType: "user.end_date",
            categoryLabel: "Offboarding",
            start: d.toISOString(),
            allDay: true,
            href: pHref,
          },
          d
        );
      }
    }

    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const sliced = allEvents.slice(0, limit);
    return NextResponse.json(
      {
        success: true,
        events: sliced,
        total: allEvents.length,
        truncated: allEvents.length > sliced.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error fetching calendar events.", "Calendar events error:");
  }
}

