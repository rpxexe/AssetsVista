"use client";

import axios from "axios";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

// Monochrome neutral slate/zinc shades aligned with the shadcn monochrome theme
const MONOCHROME_SHADES = [
  "#18181b",
  "#3f3f46",
  "#52525b",
  "#71717a",
  "#a1a1aa",
  "#d4d4d8",
  "#e4e4e7",
];

export type Status = {
  name: string;
  assets: number;
  color: string;
};

const RadialGraph = () => {
  const [groupBy, setGroupBy] = useState<"name" | "type">("name");

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
    select: (apiData) =>
      apiData
        .filter((item: any) => Number(item.assets || 0) >= 0)
        .map((item: any, index: number) => ({
          ...item,
          color: MONOCHROME_SHADES[index % MONOCHROME_SHADES.length],
        })),
  });

  const totalAssets = data.reduce((sum, item) => sum + Number(item.assets || 0), 0);

  if (loading) {
    return (
      <div className="mt-12 w-full h-[260px] flex items-center justify-center">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-xs text-muted-foreground py-8 text-center">
        Failed to fetch status data
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="w-full flex items-center justify-end gap-1 mb-1">
        <Button
          type="button"
          size="sm"
          variant={groupBy === "name" ? "secondary" : "ghost"}
          className="h-6 px-2 text-[11px]"
          onClick={() => setGroupBy("name")}
        >
          By Status
        </Button>
        <Button
          type="button"
          size="sm"
          variant={groupBy === "type" ? "secondary" : "ghost"}
          className="h-6 px-2 text-[11px]"
          onClick={() => setGroupBy("type")}
        >
          By Type
        </Button>
      </div>

      {totalAssets === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground text-center px-4">
          No assets tracked by status yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data.filter((d) => d.assets > 0)}
              innerRadius="55%"
              paddingAngle={3}
              outerRadius="82%"
              dataKey="assets"
              nameKey="name"
              stroke="hsl(var(--border))"
            >
              {data
                .filter((d) => d.assets > 0)
                .map((item, index) => (
                  <Cell key={`cell-${index}`} fill={item.color} />
                ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "10px",
                fontSize: "12px",
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="rounded-full h-2.5 w-2.5 shrink-0 border border-border"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </div>
            <span className="text-muted-foreground tabular-nums">({item.assets})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadialGraph;
