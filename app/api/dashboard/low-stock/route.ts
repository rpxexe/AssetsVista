import { apiErrorResponse } from "@/lib/apiError";
import { getLowInventory } from "@/lib/lowInventory";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const sort = searchParams.get("sort") || "remaining";
    const order = searchParams.get("order") === "desc" ? "desc" : "asc";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 25), 1), 100);

    const { items, alertThreshold } = await getLowInventory(workspaceId);

    const filtered = search
      ? items.filter(
          (item) =>
            item.name.toLowerCase().includes(search) ||
            item.typeLabel.toLowerCase().includes(search)
        )
      : [...items];

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "min_amt":
          cmp = a.min_amt - b.min_amt;
          break;
        case "percent":
          cmp = a.percent - b.percent;
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        default:
          cmp = a.remaining - b.remaining;
          break;
      }
      return order === "desc" ? -cmp : cmp;
    });

    return NextResponse.json(
      {
        success: true,
        data: filtered.slice(0, limit),
        total: filtered.length,
        alertThreshold,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error fetching low inventory.", "Low stock API error:");
  }
}

