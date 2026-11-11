"use client";

import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AssetLifecycleChartProps {
  purchaseCost: number;
  usefulLifeMonths: number;
  monthsElapsed: number;
  currencySymbol?: string;
}

/**
 * Renders a straight-line book value depreciation trajectory across the asset's useful life,
 * highlighting the current elapsed month marker.
 */
export function AssetLifecycleChart({
  purchaseCost,
  usefulLifeMonths,
  monthsElapsed,
  currencySymbol = "$",
}: AssetLifecycleChartProps) {
  const safeLife = Math.max(1, usefulLifeMonths || 36);
  const clampedElapsed = Math.min(safeLife, Math.max(0, monthsElapsed || 0));

  const series = useMemo(() => {
    const steps = 6;
    const points: Array<{ label: string; month: number; value: number }> = [];
    const stepMonths = new Set<number>([0, clampedElapsed, safeLife]);
    for (let i = 1; i < steps; i++) {
      stepMonths.add(Math.round((safeLife * i) / steps));
    }

    const sortedMonths = Array.from(stepMonths).sort((a, b) => a - b);
    for (const m of sortedMonths) {
      const value = Math.max(
        0,
        Number((purchaseCost * (1 - m / safeLife)).toFixed(2))
      );
      points.push({
        label: m === clampedElapsed && clampedElapsed > 0 ? "Now" : `M${m}`,
        month: m,
        value,
      });
    }
    return points;
  }, [purchaseCost, safeLife, clampedElapsed]);

  if (purchaseCost <= 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
        Add a purchase cost to visualize straight-line depreciation over {safeLife} months.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Book value trajectory</span>
        <span className="font-mono">{safeLife} mo schedule</span>
      </div>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="assetValueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${currencySymbol}${(v / 1000).toFixed(1)}k` : `${currencySymbol}${v}`
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const pt = payload[0].payload as { month: number; value: number };
                return (
                  <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                    <p className="text-muted-foreground">Month {pt.month}</p>
                    <p className="font-mono font-semibold text-foreground">
                      {currencySymbol}
                      {pt.value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                );
              }}
            />
            {clampedElapsed > 0 && (
              <ReferenceLine
                x="Now"
                stroke="hsl(var(--chart-1))"
                strokeDasharray="3 3"
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              fill="url(#assetValueFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

