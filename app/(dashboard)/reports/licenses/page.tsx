"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FilePieChart,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Users,
  XCircle,
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

export default function LicenseReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const bulk = useBulkSelection();

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["licenseReport"],
    queryFn: async () => {
      const response = await axios.get("/api/reports/licenses");
      return response.data.data;
    },
  });

  const items = data?.items || [];
  const summary = data?.summary || {
    total_licenses: 0,
    total_seats: 0,
    total_seats_in_use: 0,
    total_spend: 0,
    expired_count: 0,
    expiring_soon_count: 0,
  };

  const filteredItems = useMemo(() => {
    return items.filter((item: any) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = item.name?.toLowerCase() || "";
        const cat = item.category?.toLowerCase() || "";
        const mfg = item.manufacturer?.toLowerCase() || "";
        if (!name.includes(term) && !cat.includes(term) && !mfg.includes(term)) {
          return false;
        }
      }

      if (statusFilter !== "all") {
        if (item.expiry_status !== statusFilter) return false;
      }

      return true;
    });
  }, [items, searchTerm, statusFilter]);

  const exportColumns: ExportColumnDef<any>[] = useMemo(
    () => [
      { header: "Software Name", accessor: (i) => i.name || "-" },
      { header: "Category", accessor: (i) => i.category || "-" },
      { header: "Manufacturer", accessor: (i) => i.manufacturer || "-" },
      { header: "Company", accessor: (i) => i.company || "-" },
      { header: "Total Seats", accessor: (i) => Number(i.seats) || 0 },
      { header: "Seats In Use", accessor: (i) => Number(i.seats_in_use) || 0 },
      { header: "Seats Available", accessor: (i) => Number(i.seats_available) || 0 },
      { header: "Cost ($)", accessor: (i) => Number(i.purchase_cost) || 0 },
      { header: "Expiry Date", accessor: (i) => (i.expiry_date ? i.expiry_date.slice(0, 10) : "Never") },
      { header: "Expiry Status", accessor: (i) => i.expiry_status || "-" },
      {
        header: "Licensed To",
        accessor: (i) => (i.license_to_email !== "-" ? i.license_to_email : i.license_to_name) || "-",
      },
    ],
    []
  );

  const summarySheet: ExportSheet = useMemo(
    () => ({
      name: "License Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Software Licenses", summary.total_licenses],
        ["Total Seats Provisioned", summary.total_seats],
        ["Total Seats In Use", summary.total_seats_in_use],
        ["Total License Spend ($)", Number((summary.total_spend || 0).toFixed(2))],
        ["Expiring Soon Count", summary.expiring_soon_count],
        ["Expired Count", summary.expired_count],
      ],
    }),
    [summary]
  );

  const getStatusBadge = (status: string, days: number | null) => {
    switch (status) {
      case "expired":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Expired
          </Badge>
        );
      case "expiring_soon":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {days !== null ? `${days}d left` : "Expiring Soon"}
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        );
      default:
        return <Badge variant="secondary">No Expiry</Badge>;
    }
  };

  const visibleIds = filteredItems.map((lic: any) => lic._id);
  const selectedItems = filteredItems.filter((lic: any) => bulk.isSelected(lic._id));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[2.5em] p-4 bg-card">
        <div className="flex items-center gap-3">
          <FilePieChart strokeWidth={2.2} size={30} className="text-primary" />
          <div>
            <h2 className="text-2xl font-bold">License Compliance &amp; Utilization</h2>
            <p className="text-xs text-muted-foreground">
              Software seat utilization, renewals, compliance, and expenditure.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="software_licenses_report"
            sheetName="Licenses Compliance"
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

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Total Titles</span>
            <KeyRound className="h-4 w-4" />
          </div>
          <p className="text-3xl font-bold mt-2">{summary.total_licenses}</p>
          <p className="text-xs text-muted-foreground mt-1">software licenses</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Total Seats</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="text-3xl font-bold mt-2">{summary.total_seats}</p>
          <p className="text-xs text-muted-foreground mt-1">total user licenses</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Seats In Use</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-3xl font-bold mt-2 text-blue-600 dark:text-blue-400">
            {summary.total_seats_in_use}
          </p>
          <p className="text-xs text-muted-foreground mt-1">assigned to people</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Expiring / Expired</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold mt-2 text-amber-500">
            {summary.expired_count + summary.expiring_soon_count}
          </p>
          <p className="text-xs text-muted-foreground mt-1">action required</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Total Software Spend</span>
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-3xl font-bold mt-2">
            ${summary.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">capital spent</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, category, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex gap-1.5">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "expiring_soon" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("expiring_soon")}
              className="text-xs text-amber-600"
            >
              Expiring Soon
            </Button>
            <Button
              variant={statusFilter === "expired" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("expired")}
              className="text-xs text-red-600"
            >
              Expired
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing {filteredItems.length} of {items.length} licenses
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedItems.length}
        entityLabel="license"
        onClearSelection={bulk.clear}
        exportConfig={{
          filename: "software_licenses_report_selected",
          sheetName: "Licenses Compliance",
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
        <p className="text-center text-red-500 py-8">Failed to load license report.</p>
      ) : (
        <div className="rounded-2xl border overflow-x-auto bg-card">
          <Table className="min-w-max w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(visibleIds)}
                    onCheckedChange={(checked) => bulk.toggleAll(visibleIds, !!checked)}
                    aria-label="Select all licenses"
                  />
                </TableHead>
                <TableHead>Software Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Product Key</TableHead>
                <TableHead>Total Seats</TableHead>
                <TableHead>In Use</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                    No software licenses found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((lic: any) => (
                  <TableRow key={lic._id}>
                    <TableCell>
                      <Checkbox
                        checked={bulk.isSelected(lic._id)}
                        onCheckedChange={(checked) => bulk.toggleOne(lic._id, !!checked)}
                        aria-label={`Select ${lic.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-semibold">{lic.name}</TableCell>
                    <TableCell>{lic.category}</TableCell>
                    <TableCell>{lic.manufacturer}</TableCell>
                    <TableCell className="font-mono text-xs">{lic.product_key}</TableCell>
                    <TableCell className="font-semibold">{lic.seats}</TableCell>
                    <TableCell className="text-blue-600 dark:text-blue-400 font-medium">
                      {lic.seats_in_use}
                    </TableCell>
                    <TableCell className="text-green-600 dark:text-green-400 font-medium">
                      {lic.seats_available}
                    </TableCell>
                    <TableCell>${lic.purchase_cost}</TableCell>
                    <TableCell className="text-xs">
                      {lic.expiry_date
                        ? format(new Date(lic.expiry_date), "PP")
                        : "Never"}
                    </TableCell>
                    <TableCell>{getStatusBadge(lic.expiry_status, lic.days_until_expiry)}</TableCell>
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

