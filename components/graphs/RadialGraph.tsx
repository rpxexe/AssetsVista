"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "skullet/react";
import { Button } from "@/components/ui/button";
import { RadialGraphSkeleton } from "@/components/skeletons/AppSkeletons";

const TYPE_DEFAULT_COLORS: Record<string, string> = {
  deployable: "#10b981", // Emerald
  pending: "#f59e0b", // Amber
  undeployable: "#f43f5e", // Rose
  archived: "#64748b", // Slate
};

const FALLBACK_COLORS = [
  "#8b5cf6", // Violet
  "#0ea5e9", // Sky
  "#14b8a6", // Teal
  "#ec4899", // Pink
  "#eab308", // Yellow
  "#f97316", // Orange
  "#22c55e", // Green
  "#6366f1", // Indigo
];

function pickSemanticBaseColor(name: string, type?: string): string | null {
  const n = name.trim().toLowerCase();

  if (n.includes("ready") || n.includes("available") || n.includes("in stock")) {
    return "#10b981"; // Emerald
  }
  if (n.includes("checkedout") || n.includes("checked out") || n.includes("checked-out")) {
    return "#6366f1"; // Indigo
  }
  if (n === "deployed" || n.includes("deployed") || n.includes("in use")) {
    return "#3b82f6"; // Blue
  }
  if (n.includes("request")) {
    return "#06b6d4"; // Cyan
  }
  if (n.includes("repair") || n.includes("maint")) {
    return "#f97316"; // Orange
  }
  if (n.includes("pending") || n.includes("wait") || n.includes("staging")) {
    return "#f59e0b"; // Amber
  }
  if (
    n.includes("undeploy") ||
    n.includes("broken") ||
    n.includes("lost") ||
    n.includes("stolen") ||
    n.includes("damag") ||
    n.includes("fault")
  ) {
    return "#f43f5e"; // Rose
  }
  if (n.includes("archiv") || n.includes("retir") || n.includes("decommiss")) {
    return "#64748b"; // Slate
  }

  if (type && TYPE_DEFAULT_COLORS[type.toLowerCase()]) {
    return TYPE_DEFAULT_COLORS[type.toLowerCase()];
  }
  return null;
}

function assignStatusColors(items: any[]): Status[] {
  const used = new Set<string>();
  let fallbackCursor = 0;

  return items
    .filter((item) => Number(item.assets || 0) >= 0)
    .map((item) => {
      const name = String(item.name || "Unknown");
      const preferred = pickSemanticBaseColor(name, item.type);

      let color = preferred && !used.has(preferred) ? preferred : "";
      while (!color && fallbackCursor < FALLBACK_COLORS.length) {
        const candidate = FALLBACK_COLORS[fallbackCursor++];
        if (!used.has(candidate)) color = candidate;
      }
      if (!color) {
        color = FALLBACK_COLORS[fallbackCursor % FALLBACK_COLORS.length];
        fallbackCursor++;
      }

      used.add(color);
      return {
        ...item,
        name,
        assets: Number(item.assets || 0),
        color,
      };
    });
}

export type Status = {
  _id?: string;
  name: string;
  type?: string;
  assets: number;
  color: string;
};

const RadialGraph = () => {
  const router = useRouter();
  const [groupBy, setGroupBy] = useState<"name" | "type">("name");
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const {
    data = [],
    isLoading: loading,
    isError,
  } = useQuery<Status[], Error, Status[]>({
    queryKey: ["status", groupBy],
    queryFn: async () => {
      const response = await axios.get(`/api/settings/status?groupBy=${groupBy}`);
      return response.data.data ?? [];
    },
    select: (apiData) => assignStatusColors(apiData),
  });

  const activeSlices = data.filter((d) => d.assets > 0);
  const totalAssets = data.reduce((sum, item) => sum + Number(item.assets || 0), 0);
  const hoveredItem = hoveredName ? data.find((d) => d.name === hoveredName) : undefined;
  const centerValue = hoveredItem ? hoveredItem.assets : totalAssets;
  const centerShare =
    hoveredItem && totalAssets > 0 ? Math.round((hoveredItem.assets / totalAssets) * 100) : null;

  return (
    <Skeleton
      id={`radial-graph-${groupBy}`}
      loading={loading}
      label="Loading asset status chart"
      className="w-full h-full"
      error={
        !loading && isError ? (
          <div className="text-xs text-muted-foreground py-8 text-center">
            Failed to fetch status data
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <RadialGraphSkeleton />
      ) : (
        <div className="flex flex-col items-center w-full h-full">
          <div className="w-full flex items-center justify-end gap-1 mb-1">
            <Button
              type="button"
              size="sm"
              variant={groupBy === "name" ? "secondary" : "ghost"}
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                setHoveredName(null);
                setGroupBy("name");
              }}
            >
              By Status
            </Button>
            <Button
              type="button"
              size="sm"
              variant={groupBy === "type" ? "secondary" : "ghost"}
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                setHoveredName(null);
                setGroupBy("type");
              }}
            >
              By Type
            </Button>
          </div>

          {totalAssets === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground text-center px-4">
              No assets tracked by status yet.
            </div>
          ) : (
            <div className="relative w-full h-[240px]">
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-12">
                <span className="text-2xl font-bold tracking-tight tabular-nums">
                  {centerValue.toLocaleString()}
                </span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">
                  {hoveredItem ? `${centerShare}% · ${hoveredItem.name}` : "Total Assets"}
                </span>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={activeSlices}
                    innerRadius="58%"
                    paddingAngle={activeSlices.length > 1 ? 3 : 0}
                    cornerRadius={4}
                    outerRadius="84%"
                    dataKey="assets"
                    nameKey="name"
                    stroke="transparent"
                    onMouseEnter={(_, index) => {
                      const target = activeSlices[index];
                      if (target) setHoveredName(target.name);
                    }}
                    onMouseLeave={() => setHoveredName(null)}
                    onClick={(entry) => {
                      if (groupBy === "name" && entry?.name) {
                        router.push(`/assets/listall?status=${encodeURIComponent(entry.name)}`);
                      }
                    }}
                    className={groupBy === "name" ? "cursor-pointer outline-none" : "outline-none"}
                  >
                    {activeSlices.map((item, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={item.color}
                        fillOpacity={hoveredName && hoveredName !== item.name ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0];
                      const item = entry.payload as Status;
                      const pct =
                        totalAssets > 0
                          ? Math.round((Number(entry.value || 0) / totalAssets) * 100)
                          : 0;
                      return (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium">{entry.name}:</span>
                          <span className="font-semibold tabular-nums">{entry.value}</span>
                          <span className="text-muted-foreground tabular-nums">({pct}%)</span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2">
            {data.map((item) => {
              const pct =
                totalAssets > 0 ? Math.round((Number(item.assets || 0) / totalAssets) * 100) : 0;
              const clickable = groupBy === "name";
              return (
                <button
                  key={item.name}
                  type="button"
                  onMouseEnter={() => setHoveredName(item.name)}
                  onMouseLeave={() => setHoveredName(null)}
                  onClick={() => {
                    if (clickable) {
                      router.push(`/assets/listall?status=${encodeURIComponent(item.name)}`);
                    }
                  }}
                  className={`flex items-center justify-between gap-2 rounded-md px-1.5 py-0.5 text-xs text-left transition-colors ${
                    clickable ? "hover:bg-muted/60 cursor-pointer" : "cursor-default"
                  } ${hoveredName === item.name ? "bg-muted/60" : ""}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="rounded-full h-2.5 w-2.5 shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {item.assets}
                    {totalAssets > 0 ? ` (${pct}%)` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Skeleton>
  );
};

export default RadialGraph;
