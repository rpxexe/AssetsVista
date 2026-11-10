import { EntityType, executeElasticSearch } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { NextRequest, NextResponse } from "next/server";

const VALID_TYPES = new Set([
  "all",
  "asset",
  "person",
  "license",
  "accessory",
  "component",
  "consumable",
  "setting",
]);

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
    const q = searchParams.get("q") || "";
    const rawType = searchParams.get("type") || "all";
    const type = (VALID_TYPES.has(rawType) ? rawType : "all") as EntityType | "all";
    const limit = Number(searchParams.get("limit") || 25);
    const refresh = searchParams.get("refresh") === "true";

    const result = await executeElasticSearch({
      workspaceId,
      query: q,
      type,
      limit,
      refresh,
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Elastic search error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error executing search query",
      },
      { status: 500 }
    );
  }
}

