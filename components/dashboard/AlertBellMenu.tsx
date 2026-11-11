"use client";

import React from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Flag, AlertTriangle, ArrowRight } from "lucide-react";
import { Skeleton } from "skullet/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { LowStockItem } from "@/lib/lowInventory";

export function AlertBellMenu() {
  const { data, isLoading } = useQuery<{
    data: LowStockItem[];
    total: number;
  }>({
    queryKey: ["low-stock", "nav"],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/low-stock?limit=50");
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const items = data?.data || [];
  const totalCount = data?.total ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative gap-1.5 px-2.5"
          aria-label={`Alerts (${totalCount})`}
        >
          <Flag className="h-4 w-4" />
          <Skeleton loading={isLoading} label="Loading alert count" className="rounded-full">
            <span
              className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[11px] font-semibold rounded-full bg-primary text-primary-foreground ${
                !isLoading && totalCount === 0 ? "opacity-40" : ""
              }`}
            >
              {isLoading ? "0" : totalCount}
            </span>
          </Skeleton>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-foreground" />
            <span className="text-sm font-semibold">Low Inventory Alerts</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y">
          <Skeleton
            id="alert-bell-items"
            loading={isLoading}
            label="Loading low inventory alerts"
            empty={!isLoading && items.length === 0}
            emptyMessage={
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                All stocked items are above minimum thresholds.
              </div>
            }
          >
            {isLoading
              ? ["USB-C Docking Station", "CAT6 Patch Cable Pack", "Thermal Paper Rolls"].map(
                  (sampleName) => (
                    <div key={sampleName} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium truncate">{sampleName}</span>
                        <span className="text-muted-foreground shrink-0">2 remaining</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-muted" />
                        <span className="text-[10px] text-muted-foreground shrink-0">Min 10</span>
                      </div>
                    </div>
                  )
                )
              : items.slice(0, 50).map((item) => (
                  <Link
                    key={item.compositeId}
                    href={item.href}
                    className="block px-4 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {item.remaining} remaining
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.max(4, item.percent)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        Min {item.min_amt}
                      </span>
                    </div>
                  </Link>
                ))}
          </Skeleton>
        </div>

        <div className="p-2 border-t bg-muted/20">
          <Link
            href="/admin#low-inventory"
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            View Low Inventory Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

