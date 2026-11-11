"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  Filter,
  Laptop,
  RefreshCw,
  Search,
} from "lucide-react";
import { Skeleton } from "skullet/react";
import { SampleTableRows } from "@/components/skeletons/AppSkeletons";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryBox from "@/components/dropDowns/category.dropdown";
import LocationBox from "@/components/dropDowns/location.dropdown";
import StatusBox from "@/components/dropDowns/status.dropdown";
import CompanyBox from "@/components/dropDowns/company.dropdown";
import { ExportButton } from "@/components/ExportButton";
import type { ExportColumnDef, ExportSheet } from "@/lib/exportData";
import { ImageThumbnail } from "@/components/ImageThumbnail";

export default function CustomAssetReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const bulk = useBulkSelection();

  const {
    data: assets = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["customAssetReport"],
    queryFn: async () => {
      const response = await axios.get("/api/core/asset");
      return response.data.data || [];
    },
  });

  const filteredAssets = useMemo(() => {
    return assets.filter((asset: any) => {
      // Search keyword
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const tag = asset.asset_tag?.toLowerCase() || "";
        const name = asset.asset_name?.toLowerCase() || "";
        const serial = asset.serial_number?.toLowerCase() || "";
        const model = asset.asset_model?.name?.toLowerCase() || "";
        if (!tag.includes(term) && !name.includes(term) && !serial.includes(term) && !model.includes(term)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter && statusFilter !== "all") {
        const st = asset.status?.name?.toLowerCase() || "";
        if (!st.includes(statusFilter.toLowerCase())) return false;
      }

      // Location filter
      if (locationFilter && locationFilter !== "all") {
        const loc = asset.location?.name?.toLowerCase() || "";
        if (!loc.includes(locationFilter.toLowerCase())) return false;
      }

      // Company filter
      if (companyFilter && companyFilter !== "all") {
        const comp = asset.company?.name?.toLowerCase() || "";
        if (!comp.includes(companyFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [assets, searchTerm, statusFilter, locationFilter, companyFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalCost = 0;
    let deployedCount = 0;
    let availableCount = 0;

    filteredAssets.forEach((a: any) => {
      totalCost += Number(a.purchase_cost) || 0;
      if (a.assigned_to) {
        deployedCount++;
      } else {
        availableCount++;
      }
    });

    return {
      totalCount: filteredAssets.length,
      totalCost,
      deployedCount,
      availableCount,
    };
  }, [filteredAssets]);

  const exportColumns: ExportColumnDef<any>[] = useMemo(
    () => [
      { header: "Asset Tag", accessor: (a) => a.asset_tag || "-" },
      { header: "Asset Name", accessor: (a) => a.asset_name || "-" },
      { header: "Model", accessor: (a) => a.asset_model?.name || "-" },
      { header: "Serial Number", accessor: (a) => a.serial_number || "-" },
      { header: "Status", accessor: (a) => a.status?.name || "-" },
      {
        header: "Assigned To",
        accessor: (a) =>
          a.assigned_to
            ? a.assigned_to.name ||
              [a.assigned_to.first_name, a.assigned_to.last_name].filter(Boolean).join(" ")
            : "Unassigned",
      },
      { header: "Location", accessor: (a) => a.location?.name || "-" },
      { header: "Company", accessor: (a) => a.company?.name || "-" },
      { header: "Cost ($)", accessor: (a) => Number(a.purchase_cost) || 0 },
      { header: "Purchase Date", accessor: (a) => (a.purchase_date ? a.purchase_date.slice(0, 10) : "-") },
    ],
    []
  );

  const summarySheet: ExportSheet = useMemo(
    () => ({
      name: "KPI Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Filtered Assets", metrics.totalCount],
        ["Total Valuation ($)", Number(metrics.totalCost.toFixed(2))],
        ["Deployed Assets", metrics.deployedCount],
        ["Available Assets", metrics.availableCount],
        ["Total Inventory Assets", assets.length],
        ["Search Filter", searchTerm || "None"],
      ],
    }),
    [metrics, assets.length, searchTerm]
  );

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setLocationFilter("");
    setCompanyFilter("");
    bulk.clear();
  };

  const visibleAssetIds = filteredAssets.map((a: any) => a._id);
  const selectedAssets = filteredAssets.filter((a: any) => bulk.isSelected(a._id));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[2.5em] p-4 bg-card">
        <div className="flex items-center gap-3">
          <BarChart3 strokeWidth={2.2} size={30} className="text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Custom Asset Report</h2>
            <p className="text-xs text-muted-foreground">
              Filter, analyze, and export IT asset inventory and valuation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="custom_asset_report"
            sheetName="Assets Report"
            data={filteredAssets}
            selectedData={selectedAssets}
            allData={assets}
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

      {/* KPI Cards Strip */}
      <Skeleton id="custom-report-kpis" loading={isLoading} label="Loading report summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-2xl p-4 bg-card">
            <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
              <span>Filtered Assets</span>
              <Laptop className="h-4 w-4" />
            </div>
            <p className="text-3xl font-bold mt-2">{isLoading ? 64 : metrics.totalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              out of {isLoading ? 64 : assets.length} total
            </p>
          </div>

          <div className="border rounded-2xl p-4 bg-card">
            <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
              <span>Total Purchase Cost</span>
              <DollarSign className="h-4 w-4" />
            </div>
            <p className="text-3xl font-bold mt-2">
              $
              {isLoading
                ? "92,400.00"
                : metrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">original asset spend</p>
          </div>

          <div className="border rounded-2xl p-4 bg-card">
            <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
              <span>Checked Out / Deployed</span>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{isLoading ? 41 : metrics.deployedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">in employee hands</p>
          </div>

          <div className="border rounded-2xl p-4 bg-card">
            <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
              <span>Ready / Available</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{isLoading ? 23 : metrics.availableCount}</p>
            <p className="text-xs text-muted-foreground mt-1">in stock / deployable</p>
          </div>
        </div>
      </Skeleton>

      {/* Filters Bar */}
      <div className="border rounded-2xl p-4 bg-card space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Filter className="h-4 w-4" />
          Report Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Tag, Name, Serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <StatusBox
            value={statusFilter}
            onChange={setStatusFilter}
          />

          <LocationBox
            value={locationFilter}
            onChange={setLocationFilter}
          />

          <CompanyBox
            value={companyFilter}
            onChange={setCompanyFilter}
          />
        </div>

        {(searchTerm || statusFilter || locationFilter || companyFilter) && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs">
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      <BulkActionBar
        selectedCount={selectedAssets.length}
        entityLabel="asset"
        onClearSelection={bulk.clear}
        exportConfig={{
          filename: "custom_asset_report_selected",
          sheetName: "Assets Report",
          data: selectedAssets,
          columns: exportColumns,
        }}
        actions={[]}
      />

      {/* Assets Table */}
      <Skeleton
        id="custom-report-table"
        loading={isLoading}
        label="Loading custom asset report"
        empty={!isLoading && !error && filteredAssets.length === 0}
        emptyMessage={
          <div className="rounded-2xl border overflow-x-auto bg-card">
            <Table className="min-w-max w-full">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={false} disabled aria-label="Select all assets" />
                  </TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Purchase Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                    No assets matched your filter criteria.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        }
        error={
          !isLoading && error ? (
            <p className="text-center text-red-500 py-8">Failed to load asset report.</p>
          ) : undefined
        }
      >
        <div className="rounded-2xl border overflow-x-auto bg-card">
          <Table className="min-w-max w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(visibleAssetIds)}
                    onCheckedChange={(checked) => bulk.toggleAll(visibleAssetIds, !!checked)}
                    aria-label="Select all assets"
                  />
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Purchase Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SampleTableRows
                  columns={[
                    "checkbox",
                    "thumb",
                    "mono",
                    "text",
                    "text",
                    "mono",
                    "badge",
                    "badge",
                    "text",
                    "text",
                    "number",
                    "date",
                  ]}
                  rowCount={6}
                />
              ) : (
                filteredAssets.map((asset: any) => {
                  const assigned = asset.assigned_to;
                  const assignedName = assigned
                    ? assigned.name ||
                      [assigned.first_name, assigned.last_name].filter(Boolean).join(" ") ||
                      "Assigned"
                    : null;

                  return (
                    <TableRow key={asset._id}>
                      <TableCell>
                        <Checkbox
                          checked={bulk.isSelected(asset._id)}
                          onCheckedChange={(checked) => bulk.toggleOne(asset._id, !!checked)}
                          aria-label={`Select ${asset.asset_tag || asset.asset_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <ImageThumbnail
                          src={asset.image || asset.asset_model?.image}
                          alt={asset.asset_name || asset.asset_tag}
                          fallback="asset"
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="font-mono font-semibold uppercase">
                        {asset.asset_tag}
                      </TableCell>
                      <TableCell className="font-medium">{asset.asset_name}</TableCell>
                      <TableCell>{asset.asset_model?.name || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{asset.serial_number || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset.status?.name || "Status"}</Badge>
                      </TableCell>
                      <TableCell>
                        {assignedName ? (
                          <Badge
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200"
                          >
                            {assignedName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{asset.location?.name || "-"}</TableCell>
                      <TableCell>{asset.company?.name || "-"}</TableCell>
                      <TableCell className="font-medium">${Number(asset.purchase_cost) || 0}</TableCell>
                      <TableCell className="text-xs">
                        {asset.purchase_date
                          ? format(new Date(asset.purchase_date), "PP")
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Skeleton>
    </div>
  );
}

