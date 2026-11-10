import dbconnect from "@/lib/dbconnect";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { AssetModel } from "@/models/Assets.model";
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

    const assets = await AssetModel.find({ userId: workspaceId })
      .select("asset_tag asset_name asset_model company location status purchase_date purchase_cost warranty createdAt")
      .populate([
        { path: "asset_model", select: "name model_no" },
        { path: "company", select: "name" },
        { path: "location", select: "name" },
        { path: "status", select: "name" },
      ])
      .sort({ purchase_date: -1 })
      .lean();

    const now = new Date();
    let totalPurchaseCost = 0;
    let totalCurrentValue = 0;
    let totalDepreciated = 0;

    const items = assets.map((asset: any) => {
      const cost = Number(asset.purchase_cost) || 0;
      const pDate = asset.purchase_date ? new Date(asset.purchase_date) : new Date(asset.createdAt || now);

      // Useful life in months: warranty (years) * 12 or standard 36 months (3 years)
      const usefulLifeMonths =
        asset.warranty && Number(asset.warranty) > 0
          ? Number(asset.warranty) * 12
          : 36;

      // Months elapsed since purchase
      const monthsElapsed = Math.max(
        0,
        (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth())
      );

      const monthlyDepreciation = usefulLifeMonths > 0 ? cost / usefulLifeMonths : 0;
      const depreciatedAmount = Math.min(cost, Number((monthlyDepreciation * monthsElapsed).toFixed(2)));
      const currentValue = Math.max(0, Number((cost - depreciatedAmount).toFixed(2)));

      totalPurchaseCost += cost;
      totalCurrentValue += currentValue;
      totalDepreciated += depreciatedAmount;

      return {
        _id: asset._id,
        asset_tag: asset.asset_tag,
        asset_name: asset.asset_name,
        asset_model: asset.asset_model?.name || "-",
        company: asset.company?.name || "-",
        location: asset.location?.name || "-",
        status: asset.status?.name || "-",
        purchase_date: pDate.toISOString(),
        purchase_cost: cost,
        useful_life_months: usefulLifeMonths,
        months_elapsed: monthsElapsed,
        monthly_depreciation: Number(monthlyDepreciation.toFixed(2)),
        depreciated_amount: depreciatedAmount,
        current_value: currentValue,
        percent_depreciated: cost > 0 ? Math.min(100, Math.round((depreciatedAmount / cost) * 100)) : 0,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Depreciation report calculated successfully",
        data: {
          items,
          summary: {
            total_assets: assets.length,
            total_purchase_cost: Number(totalPurchaseCost.toFixed(2)),
            total_current_value: Number(totalCurrentValue.toFixed(2)),
            total_depreciated: Number(totalDepreciated.toFixed(2)),
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Depreciation report error:", error);
    return NextResponse.json(
      { success: false, message: "Error generating depreciation report" },
      { status: 500 }
    );
  }
}

