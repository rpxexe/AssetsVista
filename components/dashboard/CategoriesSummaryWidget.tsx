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
  FilePieChart,
  Keyboard,
  LayoutPanelTop,
  LibraryBig,
  Loader2,
  Microchip,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export interface CategorySummaryRow {
  _id: string;
  name: string;
  type: string;
  assets_count: number;
  licenses_count: number;
  accessories_count: number;
  consumables_count: number;
  components_count: number;
}

type SortKey = keyof Omit<CategorySummaryRow, "_id">;

export function CategoriesSummaryWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("assets_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const bulk = useBulkSelection();

  const { data, isLoading, isFetching, refetch } = useQuery<{
    categories: CategorySummaryRow[];
  }>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/summary");
      return res.data.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const rows = useMemo(() => {
    const base = data?.categories || [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? base.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            String(r.type || "").toLowerCase().includes(q)
        )
      : [...base];

    filtered.sort((a, b) => {
      const cmp =
        sortBy === "name" || sortBy === "type"
          ? String(a[sortBy]).localeCompare(String(b[sortBy]))
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

  const exportCols: ExportColumnDef<CategorySummaryRow>[] = [
    { header: "Category", accessor: (r) => r.name },
    { header: "Type", accessor: (r) => r.type },
    { header: "Assets", accessor: (r) => r.assets_count },
    { header: "Licenses", accessor: (r) => r.licenses_count },
    { header: "Accessories", accessor: (r) => r.accessories_count },
    { header: "Consumables", accessor: (r) => r.consumables_count },
    { header: "Components", accessor: (r) => r.components_count },
  ];

  const visibleIds = rows.map((r) => r._id);
  const selectedRows = rows.filter((r) => bulk.isSelected(r._id));

  return (
    <div className="border rounded-[2em] bg-card p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
          <div className="flex items-center gap-2">
            <LayoutPanelTop className="h-4 w-4 text-foreground" />
            <h4 className="font-semibold text-base">Categories</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => refetch()}
              aria-label="Refresh categories summary"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <ExportButton
              filename="categories-summary"
              sheetName="Categories"
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
              aria-label="Toggle Categories summary widget"
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
                placeholder="Search categories..."
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
              entityLabel="category"
              onClearSelection={bulk.clear}
              exportConfig={{
                filename: "categories-summary-selected",
                sheetName: "Categories",
                data: selectedRows,
                columns: exportCols,
              }}
              actions={[]}
            />

            <div className="max-h-[300px] overflow-auto border rounded-xl">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No categories found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-8">
                        <Checkbox
                          checked={bulk.headerCheckState(visibleIds)}
                          onCheckedChange={(c) => bulk.toggleAll(visibleIds, !!c)}
                          aria-label="Select all categories"
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
                      <TableHead>
                        <button type="button" onClick={() => toggleSort("type")}>
                          Type
                        </button>
                      </TableHead>
                      <TableHead className="text-center" title="Assets">
                        <button type="button" onClick={() => toggleSort("assets_count")}>
                          <LibraryBig className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center" title="Licenses">
                        <button type="button" onClick={() => toggleSort("licenses_count")}>
                          <FilePieChart className="h-3.5 w-3.5" />
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((cat) => (
                      <TableRow key={cat._id} className="text-xs">
                        <TableCell>
                          <Checkbox
                            checked={bulk.isSelected(cat._id)}
                            onCheckedChange={(c) => bulk.toggleOne(cat._id, !!c)}
                            aria-label={`Select ${cat.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium truncate max-w-[150px]">
                          <Link
                            href="/settings/category"
                            className="hover:underline inline-flex items-center gap-1.5"
                          >
                            <span className="h-2 w-2 rounded-sm bg-primary/70 shrink-0" />
                            <span className="truncate">{cat.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal lowercase">
                            {cat.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{cat.assets_count}</TableCell>
                        <TableCell className="text-center tabular-nums">{cat.licenses_count}</TableCell>
                        <TableCell className="text-center tabular-nums">{cat.accessories_count}</TableCell>
                        <TableCell className="text-center tabular-nums">{cat.consumables_count}</TableCell>
                        <TableCell className="text-center tabular-nums">{cat.components_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="pt-3 mt-3 border-t">
          <Link href="/settings/category" className="block">
            <Button variant="outline" size="sm" className="w-full rounded-full text-xs">
              View All
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

