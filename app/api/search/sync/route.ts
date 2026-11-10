import { syncSearchIndex } from "@/lib/elasticSearch";
import { getWorkspaceUserId } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const workspaceId = await getWorkspaceUserId();
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await syncSearchIndex(workspaceId);
    return NextResponse.json(
      {
        success: true,
        message: `Indexed ${result.indexedCount} documents in ${result.tookMs}ms (${result.engine})`,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search sync error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to sync search index",
      },
      { status: 500 }
    );
  }
}

