"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  PackageMinus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";
import type { LowStockItem } from "@/lib/lowInventory";

export function LowInventoryWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [adjustItem, setAdjustItem] = useState<LowStockItem | null>(null);
  const [nextQty, setNextQty] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{
    data: LowStockItem[];
    total: number;
    alertThreshold: number;
  }>({
    queryKey: ["low-stock", "dashboard", sortOrder],
    queryFn: async () => {
      const res = await axios.get(
        `/api/dashboard/low-stock?sort=remaining&order=${sortOrder}&limit=25`
      );
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const items = data?.data || [];
  const threshold = data?.alertThreshold ?? 0;

  const handleOpenAdjust = (item: LowStockItem) => {
    setAdjustItem(item);
    setNextQty(String(item.qty));
  };

  const handleSaveQty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    setSaving(true);
    try {
      const res = await axios.patch("/api/dashboard/adjust-quantity", {
        id: adjustItem.id,
        type: adjustItem.type,
        qty: Math.max(0, Number(nextQty) || 0),
      });
      toast({
        title: "Quantity Updated",
        description: res.data?.message || "Inventory quantity adjusted.",
      });
      setAdjustItem(null);
      await queryClient.invalidateQueries({ queryKey: ["low-stock"] });
      await queryClient.invalidateQueries({ queryKey: ["counttotals"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch (err) {
      toast({
        title: "Update Failed",
        description: getClientErrorMessage(err, "Unable to update quantity."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="low-inventory"
      className="border rounded-[2em] bg-card p-5 flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b">
          <div className="flex items-center gap-2">
            <PackageMinus className="h-4 w-4 text-foreground" />
            <h4 className="font-semibold text-base">Low Inventory</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Low inventory calculation formula"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Flags items whose remaining stock drops below Minimum Amount + Threshold (currently +{threshold}).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle Low Inventory widget"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed && (
          <div className="mt-3 max-h-[340px] overflow-auto border rounded-xl">
            {isLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-muted-foreground">
                No low-inventory items right now. Set a Minimum Amount (&gt; 0) on Accessories,
                Consumables, Components, Asset Models, or Licenses to monitor stock thresholds.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right w-[90px]">
                      <button
                        type="button"
                        onClick={() =>
                          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                        }
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Remaining
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[44px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.compositeId} className="text-xs">
                      <TableCell className="max-w-[180px]">
                        <Link href={item.href} className="font-medium hover:underline block truncate">
                          {item.name}
                        </Link>
                        <span className="text-[11px] text-muted-foreground">
                          {item.typeLabel} · Min {item.min_amt}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {item.remaining}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.canAdjustQuantity && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => handleOpenAdjust(item)}
                            title={`Replenish ${item.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      <Dialog open={Boolean(adjustItem)} onOpenChange={(o) => !o && setAdjustItem(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock Quantity</DialogTitle>
            <DialogDescription>
              Update on-hand units for <strong>{adjustItem?.name}</strong> (Min: {adjustItem?.min_amt}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveQty} className="space-y-4">
            <Input
              type="number"
              min={0}
              value={nextQty}
              onChange={(e) => setNextQty(e.target.value)}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjustItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Save Quantity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

