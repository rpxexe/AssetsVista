import dbconnect from "@/lib/dbconnect";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { LicenseModel } from "@/models/Licenses.model";
import { NextResponse } from "next/server";

export async function GET() {
  await dbconnect();
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const licenses = await LicenseModel.find({ userId: workspaceId })
      .select("name category company manufacturer supplier product_key seats seats_available purchase_cost purchase_date expiry_date license_to_name license_to_email")
      .populate([
        { path: "category", select: "name" },
        { path: "company", select: "name" },
        { path: "manufacturer", select: "name" },
        { path: "supplier", select: "name" },
      ])
      .sort({ expiry_date: 1 })
      .lean();

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    let totalSeats = 0;
    let totalSeatsInUse = 0;
    let totalSpend = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;

    const items = licenses.map((lic: any) => {
      const seats = Number(lic.seats) || 1;
      const seatsAvailable =
        lic.seats_available !== undefined ? Number(lic.seats_available) : seats;
      const seatsInUse = Math.max(0, seats - seatsAvailable);
      const cost = Number(lic.purchase_cost) || 0;

      totalSeats += seats;
      totalSeatsInUse += seatsInUse;
      totalSpend += cost;

      let expiryStatus: "active" | "expiring_soon" | "expired" | "no_expiry" = "no_expiry";
      let daysUntilExpiry: number | null = null;

      if (lic.expiry_date) {
        const exp = new Date(lic.expiry_date);
        const diffMs = exp.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          expiryStatus = "expired";
          expiredCount++;
        } else if (daysUntilExpiry <= 30) {
          expiryStatus = "expiring_soon";
          expiringSoonCount++;
        } else {
          expiryStatus = "active";
        }
      }

      return {
        _id: lic._id,
        name: lic.name,
        category: lic.category?.name || "-",
        company: lic.company?.name || "-",
        manufacturer: lic.manufacturer?.name || "-",
        supplier: lic.supplier?.name || "-",
        product_key: lic.product_key
          ? lic.product_key.length > 8
            ? `••••-••••-${lic.product_key.slice(-4)}`
            : lic.product_key
          : "-",
        seats,
        seats_available: seatsAvailable,
        seats_in_use: seatsInUse,
        purchase_cost: cost,
        purchase_date: lic.purchase_date,
        expiry_date: lic.expiry_date,
        days_until_expiry: daysUntilExpiry,
        expiry_status: expiryStatus,
        license_to_name: lic.license_to_name || "-",
        license_to_email: lic.license_to_email || "-",
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "License report fetched successfully",
        data: {
          items,
          summary: {
            total_licenses: licenses.length,
            total_seats: totalSeats,
            total_seats_in_use: totalSeatsInUse,
            total_spend: totalSpend,
            expired_count: expiredCount,
            expiring_soon_count: expiringSoonCount,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("License report error:", error);
    return NextResponse.json(
      { success: false, message: "Error generating license report" },
      { status: 500 }
    );
  }
}

