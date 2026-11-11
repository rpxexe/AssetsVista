"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Droplets,
  FilePieChart,
  Keyboard,
  LibraryBig,
  Loader2,
  Microchip,
  Plus,
  RefreshCw,
  Search,
  User,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ExportColumnDef } from "@/lib/exportData";
import { ExportButton } from "@/components/ExportButton";

interface ActivityEntry {
  _id: string;
  action_type: string;
  item_type: string;
  item_id: string;
  item_name?: string;
  target_type?: string | null;
  target_id?: string | null;
  target_name?: string;
  admin_name?: string;
  notes?: string;
  createdAt?: string;
  created_at?: string;
}

function getItemIcon(itemType: string) {
  switch (itemType) {
    case "Asset":
      return LibraryBig;
    case "License":
      return FilePieChart;
    case "Accessory":
      return Keyboard;
    case "Component":
      return Microchip;
    case "Consumable":
      return Droplets;
    case "Maintenance":
      return Wrench;
    case "User":
    case "People":
      return User;
    default:
      return Plus;
  }
}

function getItemHref(entry: ActivityEntry): string {
  const q = entry.item_name ? `?search=${encodeURIComponent(entry.item_name)}` : "";
  switch (entry.item_type) {
    case "Asset":
      return `/assets/listall${q}`;
    case "License":
      return `/licenses${q}`;
    case "Accessory":
      return `/accessories${q}`;
    case "Component":
      return `/components${q}`;
    case "Consumable":
      return `/consumables${q}`;
    case "Maintenance":
      return "/maintenances";
    case "CheckoutRequest":
      return "/requests";
    case "People":
    case "User":
      return "/people";
    default:
      return "/reports/activity";
  }
}

export function RecentActivityWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  const { data = [], isLoading, isFetching, refetch } = useQuery<ActivityEntry[]>({
    queryKey: ["dashboard-recent-activity"],
    queryFn: async () => {
      const res = await axios.get("/api/core/actionlog?limit=25");
      return res.data.data || [];
    },
    staleTime: 1000 * 60,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      [row.item_name, row.target_name, row.admin_name, row.action_type, row.item_type, row.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, search]);

  const exportCols: ExportColumnDef<ActivityEntry>[] = useMemo(
    () => [
      {
        header: "Date",
        accessor: (r) => {
          const ts = r.createdAt || r.created_at;
          return ts ? format(new Date(ts), "yyyy-MM-dd HH:mm") : "-";
        },
      },
      { header: "Created By", accessor: (r) => r.admin_name || "System" },
      { header: "Action", accessor: (r) => r.action_type },
      { header: "Type", accessor: (r) => r.item_type },
      { header: "Item", accessor: (r) => r.item_name || "-" },
      { header: "Target", accessor: (r) => r.target_name || "-" },
    ],
    []
  );

  return (
    <div className="border rounded-[2em] bg-card p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-foreground" />
            <h4 className="font-semibold text-base">Recent Activity</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => refetch()}
              aria-label="Refresh recent activity"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <ExportButton
              filename="recent-activity"
              sheetName="Recent Activity"
              data={filtered}
              columns={exportCols}
              size="sm"
              variant="ghost"
              label="Export"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle recent activity widget"
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {!collapsed && (
          <div className="mt-3 space-y-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activity..."
                className="h-8 pl-8 pr-7 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear activity search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-[300px] overflow-auto border rounded-xl">
              {isLoading ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No recent activity recorded in this workspace.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[115px]">Date</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 12).map((row) => {
                      const Icon = getItemIcon(row.item_type);
                      const ts = row.createdAt || row.created_at;
                      return (
                        <TableRow key={row._id} className="text-xs">
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {ts ? format(new Date(ts), "dd MMM HH:mm") : "-"}
                          </TableCell>
                          <TableCell className="truncate max-w-[110px]">
                            {row.admin_name || "Admin"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize font-normal">
                              {row.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[190px]">
                            <Link
                              href={getItemHref(row)}
                              className="inline-flex items-center gap-1.5 font-medium hover:underline truncate max-w-full"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">{row.item_name || row.item_type}</span>
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-[130px] truncate text-muted-foreground">
                            {row.target_type === "People" && row.target_id ? (
                              <Link
                                href={`/people/${row.target_id}`}
                                className="hover:text-foreground hover:underline inline-flex items-center gap-1"
                              >
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate">{row.target_name || "Person"}</span>
                              </Link>
                            ) : (
                              row.target_name || "-"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="pt-3 mt-3 border-t">
          <Link href="/reports/activity" className="block">
            <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-full text-xs">
              View All
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

