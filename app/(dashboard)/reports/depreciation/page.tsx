"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  Coins,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/BulkActionBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "@/components/ExportButton";
import type { ExportColumnDef, ExportSheet } from "@/lib/exportData";

export default function DepreciationReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const bulk = useBulkSelection();

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["depreciationReport"],
    queryFn: async () => {
      const response = await axios.get("/api/reports/depreciation");
      return response.data.data;
    },
  });

  const items = data?.items || [];
  const summary = data?.summary || {
    total_assets: 0,
    total_purchase_cost: 0,
    total_current_value: 0,
    total_depreciated: 0,
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item: any) =>
        item.asset_tag?.toLowerCase().includes(term) ||
        item.asset_name?.toLowerCase().includes(term) ||
        item.asset_model?.toLowerCase().includes(term) ||
        item.company?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const exportColumns: ExportColumnDef<any>[] = useMemo(
    () => [
      { header: "Asset Tag", accessor: (i) => i.asset_tag || "-" },
      { header: "Asset Name", accessor: (i) => i.asset_name || "-" },
      { header: "Model", accessor: (i) => i.asset_model || "-" },
      { header: "Company", accessor: (i) => i.company || "-" },
      { header: "Location", accessor: (i) => i.location || "-" },
      { header: "Purchase Date", accessor: (i) => (i.purchase_date ? i.purchase_date.slice(0, 10) : "") },
      { header: "Original Cost ($)", accessor: (i) => Number(i.purchase_cost) || 0 },
      { header: "Useful Life (Months)", accessor: (i) => Number(i.useful_life_months) || 0 },
      { header: "Age (Months)", accessor: (i) => Number(i.months_elapsed) || 0 },
      { header: "Monthly Depreciation ($)", accessor: (i) => Number(i.monthly_depreciation) || 0 },
      { header: "Depreciated Amount ($)", accessor: (i) => Number(i.depreciated_amount) || 0 },
      { header: "Current Book Value ($)", accessor: (i) => Number(i.current_value) || 0 },
      { header: "Depreciated %", accessor: (i) => `${i.percent_depreciated ?? 0}%` },
    ],
    []
  );

  const summarySheet: ExportSheet = useMemo(
    () => ({
      name: "Depreciation Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Evaluated Assets", summary.total_assets],
        ["Total Original Spend ($)", Number((summary.total_purchase_cost || 0).toFixed(2))],
        ["Current Book Value ($)", Number((summary.total_current_value || 0).toFixed(2))],
        ["Depreciated to Date ($)", Number((summary.total_depreciated || 0).toFixed(2))],
      ],
    }),
    [summary]
  );

  const visibleIds = filteredItems.map((item: any) => item._id);
  const selectedItems = filteredItems.filter((item: any) => bulk.isSelected(item._id));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[2.5em] p-4 bg-card">
        <div className="flex items-center gap-3">
          <Coins strokeWidth={2.2} size={30} className="text-amber-500" />
          <div>
            <h2 className="text-2xl font-bold">Asset Depreciation &amp; Valuation</h2>
            <p className="text-xs text-muted-foreground">
              Straight-line asset depreciation calculations and current book value.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="asset_depreciation_report"
            sheetName="Depreciation"
            data={filteredItems}
            selectedData={selectedItems}
            allData={items}
            columns={exportColumns}
            summarySheet={summarySheet}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Total Evaluated Assets</span>
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <p className="text-3xl font-bold mt-2">{summary.total_assets}</p>
          <p className="text-xs text-muted-foreground mt-1">hardware assets tracked</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Total Original Spend</span>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-3xl font-bold mt-2">
            ${summary.total_purchase_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">historical capital expenditure</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Current Book Value</span>
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">
            ${summary.total_current_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">remaining asset valuation</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Depreciated to Date</span>
            <TrendingDown className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-3xl font-bold mt-2 text-amber-600 dark:text-amber-400">
            ${summary.total_depreciated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">accumulated asset write-off</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tag, name, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {filteredItems.length} of {items.length} assets
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedItems.length}
        entityLabel="asset"
        onClearSelection={bulk.clear}
        exportConfig={{
          filename: "asset_depreciation_report_selected",
          sheetName: "Depreciation",
          data: selectedItems,
          columns: exportColumns,
        }}
        actions={[]}
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-8">Failed to calculate depreciation.</p>
      ) : (
        <div className="rounded-2xl border overflow-x-auto bg-card">
          <Table className="min-w-max w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(visibleIds)}
                    onCheckedChange={(checked) => bulk.toggleAll(visibleIds, !!checked)}
                    aria-label="Select all assets"
                  />
                </TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Purchase Cost</TableHead>
                <TableHead>Useful Life</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Depreciation/Mo</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Depreciated %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                    No assets found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item: any) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <Checkbox
                        checked={bulk.isSelected(item._id)}
                        onCheckedChange={(checked) => bulk.toggleOne(item._id, !!checked)}
                        aria-label={`Select ${item.asset_tag || item.asset_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-semibold uppercase">
                      {item.asset_tag}
                    </TableCell>
                    <TableCell className="font-medium">{item.asset_name}</TableCell>
                    <TableCell>{item.asset_model}</TableCell>
                    <TableCell className="text-xs">
                      {item.purchase_date
                        ? format(new Date(item.purchase_date), "PP")
                        : "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">${item.purchase_cost}</TableCell>
                    <TableCell className="text-xs">{item.useful_life_months} mos</TableCell>
                    <TableCell className="text-xs">{item.months_elapsed} mos</TableCell>
                    <TableCell className="text-xs font-mono">${item.monthly_depreciation}</TableCell>
                    <TableCell className="font-bold text-green-600 dark:text-green-400">
                      ${item.current_value}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              item.percent_depreciated >= 100
                                ? "bg-red-500"
                                : item.percent_depreciated > 50
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${item.percent_depreciated}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{item.percent_depreciated}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

