"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Droplets,
  Keyboard,
  LibraryBig,
  MapPin,
  Microchip,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { Skeleton } from "skullet/react";
import { SampleTableRows } from "@/components/skeletons/AppSkeletons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Input } from "@/components/ui/input";
import { useBulkSelection } from "@/hooks/useBulkSelection";
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

export interface LocationSummaryRow {
  _id: string;
  name: string;
  assets_count: number;
  assigned_assets_count: number;
  accessories_count: number;
  consumables_count: number;
  components_count: number;
  people_count: number;
}

type SortKey = keyof Omit<LocationSummaryRow, "_id">;

export function LocationsSummaryWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("assets_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const bulk = useBulkSelection();

  const { data, isLoading, isFetching, refetch } = useQuery<{
    locations: LocationSummaryRow[];
  }>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/summary");
      return res.data.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const rows = useMemo(() => {
    const base = data?.locations || [];
    const q = search.trim().toLowerCase();
    const filtered = q ? base.filter((r) => r.name.toLowerCase().includes(q)) : [...base];

    filtered.sort((a, b) => {
      const cmp =
        sortBy === "name"
          ? a.name.localeCompare(b.name)
          : Number(a[sortBy]) - Number(b[sortBy]);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return filtered;
  }, [data, search, sortBy, sortDir]);

  const toggleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const exportCols: ExportColumnDef<LocationSummaryRow>[] = [
    { header: "Location", accessor: (r) => r.name },
    { header: "Assets", accessor: (r) => r.assets_count },
    { header: "Assigned Assets", accessor: (r) => r.assigned_assets_count },
    { header: "Accessories", accessor: (r) => r.accessories_count },
    { header: "Consumables", accessor: (r) => r.consumables_count },
    { header: "Components", accessor: (r) => r.components_count },
    { header: "People", accessor: (r) => r.people_count },
  ];

  const visibleIds = rows.map((r) => r._id);
  const selectedRows = rows.filter((r) => bulk.isSelected(r._id));

  return (
    <div className="border rounded-[2em] bg-card p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-foreground" />
            <h4 className="font-semibold text-base">Locations</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => refetch()}
              aria-label="Refresh locations summary"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <ExportButton
              filename="locations-summary"
              sheetName="Locations"
              data={rows}
              selectedData={selectedRows}
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
              aria-label="Toggle Locations summary widget"
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
                placeholder="Search locations..."
                className="h-8 pl-8 pr-7 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <BulkActionBar
              selectedCount={selectedRows.length}
              entityLabel="location"
              onClearSelection={bulk.clear}
              exportConfig={{
                filename: "locations-summary-selected",
                sheetName: "Locations",
                data: selectedRows,
                columns: exportCols,
              }}
              actions={[]}
            />

            <div className="max-h-[300px] overflow-auto border rounded-xl">
              <Skeleton
                id="dashboard-locations-summary"
                loading={isLoading}
                label="Loading locations summary"
                empty={!isLoading && rows.length === 0}
                emptyMessage={
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    No locations found.
                  </div>
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-8">
                        <Checkbox
                          checked={bulk.headerCheckState(visibleIds)}
                          onCheckedChange={(c) => bulk.toggleAll(visibleIds, !!c)}
                          aria-label="Select all locations"
                        />
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => toggleSort("name")}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Name <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center" title="Assets">
                        <button type="button" onClick={() => toggleSort("assets_count")} className="inline-flex items-center gap-1">
                          <LibraryBig className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button type="button" onClick={() => toggleSort("assigned_assets_count")}>
                          Assigned
                        </button>
                      </TableHead>
                      <TableHead className="text-center" title="Accessories">
                        <button type="button" onClick={() => toggleSort("accessories_count")}>
                          <Keyboard className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center" title="Consumables">
                        <button type="button" onClick={() => toggleSort("consumables_count")}>
                          <Droplets className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center" title="Components">
                        <button type="button" onClick={() => toggleSort("components_count")}>
                          <Microchip className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center" title="People">
                        <button type="button" onClick={() => toggleSort("people_count")}>
                          <Users className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <SampleTableRows
                        columns={[
                          "checkbox",
                          "text",
                          "number",
                          "number",
                          "number",
                          "number",
                          "number",
                          "number",
                        ]}
                        rowCount={5}
                      />
                    ) : (
                      rows.map((loc) => (
                        <TableRow key={loc._id} className="text-xs">
                          <TableCell>
                            <Checkbox
                              checked={bulk.isSelected(loc._id)}
                              onCheckedChange={(c) => bulk.toggleOne(loc._id, !!c)}
                              aria-label={`Select ${loc.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium truncate max-w-[160px]">
                            <Link
                              href={`/settings/location`}
                              className="hover:underline inline-flex items-center gap-1.5"
                            >
                              <span className="h-2 w-2 rounded-sm bg-primary/70 shrink-0" />
                              <span className="truncate">{loc.name}</span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{loc.assets_count}</TableCell>
                          <TableCell className="text-center tabular-nums">{loc.assigned_assets_count}</TableCell>
                          <TableCell className="text-center tabular-nums">{loc.accessories_count}</TableCell>
                          <TableCell className="text-center tabular-nums">{loc.consumables_count}</TableCell>
                          <TableCell className="text-center tabular-nums">{loc.components_count}</TableCell>
                          <TableCell className="text-center tabular-nums">{loc.people_count}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Skeleton>
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="pt-3 mt-3 border-t">
          <Link href="/settings/location" className="block">
            <Button variant="outline" size="sm" className="w-full rounded-full text-xs">
              View All
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

