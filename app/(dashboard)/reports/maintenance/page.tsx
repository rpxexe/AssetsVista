"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/ExportButton";
import {
  buildExportMatrix,
  exportSheetsToExcel,
  exportToCsv,
  type ExportColumnDef,
} from "@/lib/exportData";

export default function MaintenanceReportPage() {
  const [activeTab, setActiveTab] = useState<"due_audit" | "overdue_checkins" | "recent_audits">(
    "due_audit"
  );
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["maintenanceReport"],
    queryFn: async () => {
      const response = await axios.get("/api/reports/maintenance");
      return response.data.data;
    },
  });

  const dueForAudit = data?.due_for_audit || [];
  const overdueCheckins = data?.overdue_checkins || [];
  const recentAudits = data?.recent_audits || [];
  const summary = data?.summary || {
    due_for_audit_count: 0,
    overdue_checkin_count: 0,
    total_audits_logged: 0,
  };

  const handleAuditAsset = async (assetId: string, assetTag: string) => {
    setAuditingId(assetId);
    try {
      const response = await axios.post(`/api/core/asset/${assetId}/audit`, {
        notes: "Asset physically verified and audited.",
      });
      toast({
        title: "Asset Audited",
        description: response.data.message || `${assetTag} audit recorded.`,
      });
      queryClient.invalidateQueries({ queryKey: ["maintenanceReport"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["actionlogs"] });
    } catch (err: any) {
      console.error("Audit error:", err);
      toast({
        title: "Audit Failed",
        description: err.response?.data?.message || "Failed to record audit.",
        variant: "destructive",
      });
    } finally {
      setAuditingId(null);
    }
  };

  const dueAuditCols: ExportColumnDef<any>[] = [
    { header: "Asset Tag", accessor: (a) => a.asset_tag || "-" },
    { header: "Asset Name", accessor: (a) => a.asset_name || "-" },
    { header: "Model", accessor: (a) => a.asset_model?.name || "-" },
    { header: "Location", accessor: (a) => a.location?.name || "-" },
    { header: "Status", accessor: (a) => a.status?.name || "-" },
    { header: "Last Audit Date", accessor: (a) => (a.last_audit_date ? a.last_audit_date.slice(0, 10) : "Never") },
    { header: "Next Audit Date", accessor: (a) => (a.next_audit_date ? a.next_audit_date.slice(0, 10) : "Overdue") },
  ];

  const overdueCols: ExportColumnDef<any>[] = [
    { header: "Asset Tag", accessor: (a) => a.asset_tag || "-" },
    { header: "Asset Name", accessor: (a) => a.asset_name || "-" },
    { header: "Model", accessor: (a) => a.asset_model?.name || "-" },
    {
      header: "Assigned To",
      accessor: (a) =>
        a.assigned_to
          ? a.assigned_to.name || `${a.assigned_to.first_name || ""} ${a.assigned_to.last_name || ""}`.trim()
          : "-",
    },
    { header: "Expected Checkin Date", accessor: (a) => (a.expected_checkin_date ? a.expected_checkin_date.slice(0, 10) : "-") },
    { header: "Location", accessor: (a) => a.location?.name || "-" },
  ];

  const auditHistoryCols: ExportColumnDef<any>[] = [
    { header: "Date", accessor: (l) => (l.createdAt ? new Date(l.createdAt).toLocaleString() : "") },
    { header: "Item", accessor: (l) => l.item_name || l.item_id || "-" },
    { header: "Actor", accessor: (l) => l.user?.name || l.user?.username || "Admin" },
    { header: "Notes", accessor: (l) => l.note || "" },
  ];

  const activeExportConfig =
    activeTab === "due_audit"
      ? {
          filename: "assets_due_for_audit",
          sheetName: "Due for Audit",
          data: dueForAudit,
          columns: dueAuditCols,
        }
      : activeTab === "overdue_checkins"
      ? {
          filename: "overdue_asset_checkins",
          sheetName: "Overdue Checkins",
          data: overdueCheckins,
          columns: overdueCols,
        }
      : {
          filename: "audit_history_logs",
          sheetName: "Audit History",
          data: recentAudits,
          columns: auditHistoryCols,
        };

  const maintenanceSummarySheet = {
    name: "Audit Overview",
    headers: ["Metric", "Count"],
    rows: [
      ["Assets Due for Audit", summary.due_for_audit_count ?? dueForAudit.length],
      ["Overdue Check-ins", summary.overdue_checkin_count ?? overdueCheckins.length],
      ["Audits Logged", summary.total_audits_logged ?? recentAudits.length],
    ],
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[2.5em] p-4 bg-card">
        <div className="flex items-center gap-3">
          <Wrench strokeWidth={2.2} size={30} className="text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Asset Audit &amp; Maintenance</h2>
            <p className="text-xs text-muted-foreground">
              Equipment physical audits, verification scheduling, and overdue return tracking.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename={activeExportConfig.filename}
            sheetName={activeExportConfig.sheetName}
            data={activeExportConfig.data}
            columns={activeExportConfig.columns}
            summarySheet={maintenanceSummarySheet}
            extraExcelOptions={[
              {
                id: "all-tabs-workbook",
                label: "All 3 Audit Tabs (Multi-Sheet)",
                badge: "4 sheets",
                disabled:
                  dueForAudit.length === 0 &&
                  overdueCheckins.length === 0 &&
                  recentAudits.length === 0,
                onSelect: () => {
                  const due = buildExportMatrix(dueForAudit, dueAuditCols);
                  const overdue = buildExportMatrix(overdueCheckins, overdueCols);
                  const history = buildExportMatrix(recentAudits, auditHistoryCols);
                  exportSheetsToExcel("maintenance_and_audit_complete", [
                    maintenanceSummarySheet,
                    { name: "Due for Audit", headers: due.headers, rows: due.rows },
                    { name: "Overdue Checkins", headers: overdue.headers, rows: overdue.rows },
                    { name: "Audit History", headers: history.headers, rows: history.rows },
                  ]);
                },
              },
            ]}
            extraCsvOptions={[
              {
                id: "csv-due-audit",
                label: "Due for Audit Tab",
                badge: dueForAudit.length,
                disabled: dueForAudit.length === 0,
                onSelect: () => {
                  const { headers, rows } = buildExportMatrix(dueForAudit, dueAuditCols);
                  exportToCsv("assets_due_for_audit", headers, rows);
                },
              },
              {
                id: "csv-overdue",
                label: "Overdue Check-ins Tab",
                badge: overdueCheckins.length,
                disabled: overdueCheckins.length === 0,
                onSelect: () => {
                  const { headers, rows } = buildExportMatrix(overdueCheckins, overdueCols);
                  exportToCsv("overdue_asset_checkins", headers, rows);
                },
              },
              {
                id: "csv-history",
                label: "Audit History Tab",
                badge: recentAudits.length,
                disabled: recentAudits.length === 0,
                onSelect: () => {
                  const { headers, rows } = buildExportMatrix(recentAudits, auditHistoryCols);
                  exportToCsv("audit_history_logs", headers, rows);
                },
              },
            ]}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Due for Audit</span>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold mt-2 text-amber-500">{summary.due_for_audit_count}</p>
          <p className="text-xs text-muted-foreground mt-1">assets requiring physical verification</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Overdue Returns</span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-3xl font-bold mt-2 text-red-500">{summary.overdue_checkin_count}</p>
          <p className="text-xs text-muted-foreground mt-1">past expected checkin date</p>
        </div>

        <div className="border rounded-2xl p-4 bg-card">
          <div className="flex justify-between text-muted-foreground text-xs uppercase font-medium">
            <span>Audits Recorded</span>
            <History className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-3xl font-bold mt-2 text-purple-600 dark:text-purple-400">
            {summary.total_audits_logged}
          </p>
          <p className="text-xs text-muted-foreground mt-1">verified physical audits</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "due_audit" ? "default" : "ghost"}
          className="rounded-b-none"
          onClick={() => setActiveTab("due_audit")}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Due for Audit ({dueForAudit.length})
        </Button>
        <Button
          variant={activeTab === "overdue_checkins" ? "default" : "ghost"}
          className="rounded-b-none"
          onClick={() => setActiveTab("overdue_checkins")}
        >
          <Clock className="mr-2 h-4 w-4" />
          Overdue Check-ins ({overdueCheckins.length})
        </Button>
        <Button
          variant={activeTab === "recent_audits" ? "default" : "ghost"}
          className="rounded-b-none"
          onClick={() => setActiveTab("recent_audits")}
        >
          <History className="mr-2 h-4 w-4" />
          Audit History ({recentAudits.length})
        </Button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-8">Failed to load maintenance data.</p>
      ) : activeTab === "due_audit" ? (
        <div className="rounded-2xl border overflow-x-auto bg-card">
          <Table className="min-w-max w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Last Audit</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dueForAudit.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-green-600 font-medium">
                    All assets are currently audited and up to date!
                  </TableCell>
                </TableRow>
              ) : (
                dueForAudit.map((a: any) => {
                  const assigned = a.assigned_to;
                  const assignedName = assigned
                    ? assigned.name ||
                      [assigned.first_name, assigned.last_name].filter(Boolean).join(" ") ||
                      "Assigned"
                    : "In Stock";

                  return (
                    <TableRow key={a._id}>
                      <TableCell className="font-mono font-semibold uppercase">
                        {a.asset_tag}
                      </TableCell>
                      <TableCell className="font-medium">{a.asset_name}</TableCell>
                      <TableCell>{a.asset_model?.name || "-"}</TableCell>
                      <TableCell>{a.location?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.status?.name || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{assignedName}</TableCell>
                      <TableCell className="text-xs">
                        {a.last_audit_date
                          ? format(new Date(a.last_audit_date), "PP")
                          : "Never Audited"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAuditAsset(a._id, a.asset_tag)}
                          disabled={auditingId === a._id}
                          className="border-purple-600 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                        >
                          {auditingId === a._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                              Audit Now
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : activeTab === "overdue_checkins" ? (
        <div className="rounded-2xl border overflow-x-auto bg-card">
          <Table className="min-w-max w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueCheckins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No equipment currently overdue for check-in.
                  </TableCell>
                </TableRow>
              ) : (
                overdueCheckins.map((a: any) => {
                  const assigned = a.assigned_to;
                  const assignedName = assigned
                    ? assigned.name ||
                      [assigned.first_name, assigned.last_name].filter(Boolean).join(" ") ||
                      "Assigned"
                    : "-";

                  return (
                    <TableRow key={a._id}>
                      <TableCell className="font-mono font-semibold uppercase">
                        {a.asset_tag}
                      </TableCell>
                      <TableCell className="font-medium">{a.asset_name}</TableCell>
                      <TableCell>{a.asset_model?.name || "-"}</TableCell>
                      <TableCell className="font-semibold text-blue-600">{assignedName}</TableCell>
                      <TableCell className="text-red-600 font-semibold text-xs">
                        {a.expected_checkin_date
                          ? format(new Date(a.expected_checkin_date), "PP")
                          : "Past Due"}
                      </TableCell>
                      <TableCell>{a.location?.name || "-"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-x-auto bg-card">
          <Table className="min-w-max w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item Audited</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAudits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No audit records logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentAudits.map((log: any) => (
                  <TableRow key={log._id}>
                    <TableCell className="text-xs">
                      {log.createdAt ? format(new Date(log.createdAt), "PPp") : "-"}
                    </TableCell>
                    <TableCell className="font-semibold">{log.item_name || log.item_id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.user?.name || log.user?.username || "Admin"}
                    </TableCell>
                    <TableCell className="text-xs">{log.note || "-"}</TableCell>
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

