"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  DoorOpen,
  Eye,
  KeyRound,
  Laptop,
  Lock,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Skeleton } from "skullet/react";

import { ExportButton } from "@/components/ExportButton";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import {
  OffboardPersonDialog,
  OffboardTargetPerson,
} from "@/components/people/OffboardPersonDialog";
import { SampleTableRows } from "@/components/skeletons/AppSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import type { ExportColumnDef } from "@/lib/exportData";

interface OffboardingPersonRow extends OffboardTargetPerson {
  username?: string;
  title?: string;
  image?: string;
  department?: { name?: string } | null;
  location?: { name?: string } | null;
  is_overdue: boolean;
  days_remaining: number | null;
  needs_clearance: boolean;
  offboarding_risk: "cleared" | "warning" | "critical";
}

function renderUrgencyBadge(daysRemaining: number | null) {
  if (daysRemaining === null) return null;
  if (daysRemaining < 0) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Overdue by {Math.abs(daysRemaining)}d
      </Badge>
    );
  }
  if (daysRemaining === 0) {
    return (
      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px]">
        Departing Today
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-500/30">
      In {daysRemaining}d
    </Badge>
  );
}

export default function OffboardingCommandCenterPage() {
  const { permissions } = usePermissions();
  const [windowDays, setWindowDays] = useState("30");
  const [includeClearedPast, setIncludeClearedPast] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<OffboardingPersonRow | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery<OffboardingPersonRow[]>({
    queryKey: ["people-offboarding", windowDays, includeClearedPast],
    queryFn: async () => {
      const params = new URLSearchParams({
        filter: "offboarding",
        end_date_within: windowDays,
      });
      if (includeClearedPast) params.set("include_cleared", "1");
      const res = await axios.get(`/api/core/people?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) =>
      [p.name, p.email, p.username, p.department?.name, p.location?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const metrics = useMemo(() => {
    let overdue = 0;
    let atRisk = 0;
    let unreturnedAssets = 0;
    let exposureValue = 0;
    let openLogins = 0;
    let openApiKeys = 0;

    for (const r of rows) {
      if (r.is_overdue) overdue += 1;
      if (r.needs_clearance) atRisk += 1;
      unreturnedAssets += r.assets_count ?? 0;
      exposureValue += Number(r.total_asset_value ?? 0);
      if (r.user_id && r.isActive !== false) openLogins += 1;
      openApiKeys += r.active_api_keys_count ?? 0;
    }

    return {
      total: rows.length,
      overdue,
      atRisk,
      unreturnedAssets,
      exposureValue,
      openLogins,
      openApiKeys,
    };
  }, [rows]);

  const exportColumns: ExportColumnDef<OffboardingPersonRow>[] = [
    { header: "Employee", accessor: (p) => p.name || "-" },
    { header: "Email", accessor: (p) => p.email || "-" },
    { header: "Department", accessor: (p) => p.department?.name || "-" },
    {
      header: "End Date",
      accessor: (p) => (p.end_date ? format(new Date(p.end_date), "yyyy-MM-dd") : "-"),
    },
    { header: "Days Remaining", accessor: (p) => p.days_remaining ?? "-" },
    { header: "Unreturned Assets", accessor: (p) => p.assets_count ?? 0 },
    { header: "Equipment Value ($)", accessor: (p) => p.total_asset_value ?? 0 },
    { header: "Licenses", accessor: (p) => p.licenses_count ?? 0 },
    {
      header: "Login Status",
      accessor: (p) => (p.user_id ? (p.isActive !== false ? "Enabled" : "Suspended") : "None"),
    },
    { header: "Active API Keys", accessor: (p) => p.active_api_keys_count ?? 0 },
    { header: "Clearance Risk", accessor: (p) => p.offboarding_risk.toUpperCase() },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
      {/* Header */}
      <div className="border rounded-[2.5em] p-4 sm:p-5 w-full flex flex-wrap items-center justify-between gap-3 bg-card">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-amber-500/10 text-amber-600 dark:text-amber-300 shrink-0">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl sm:text-3xl font-semibold">
                Offboarding Command Center
              </h3>
              {metrics.atRisk > 0 && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40">
                  {metrics.atRisk} Require Clearance
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Monitors overdue &amp; upcoming departures with unreturned hardware value, software
              seats, portal logins, and active API tokens — resolve everything in one click.
            </p>
          </div>
        </div>

        <Link href="/people">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            All People
          </Button>
        </Link>
      </div>

      {/* Live Risk Exposure KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Departures Tracked</span>
            <DoorOpen className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold">{metrics.total}</p>
          <p className="text-[11px] text-muted-foreground">
            {metrics.overdue > 0 ? `${metrics.overdue} overdue departure(s)` : "No overdue departures"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>At-Risk Clearances</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold">{metrics.atRisk}</p>
          <p className="text-[11px] text-muted-foreground">
            Still holding equipment, licenses, login, or keys
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Unreturned Asset Value</span>
            <Laptop className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">${metrics.exposureValue.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">
            Across {metrics.unreturnedAssets} assigned asset(s)
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Open Logins &amp; API Keys</span>
            <KeyRound className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">
            {metrics.openLogins + metrics.openApiKeys}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {metrics.openLogins} active login(s) · {metrics.openApiKeys} API token(s)
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search departing staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Select value={windowDays} onValueChange={setWindowDays}>
            <SelectTrigger className="w-[165px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Next 7 days + Overdue</SelectItem>
              <SelectItem value="14">Next 14 days + Overdue</SelectItem>
              <SelectItem value="30">Next 30 days + Overdue</SelectItem>
              <SelectItem value="60">Next 60 days + Overdue</SelectItem>
              <SelectItem value="90">Next 90 days + Overdue</SelectItem>
            </SelectContent>
          </Select>

          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none px-2">
            <Checkbox
              checked={includeClearedPast}
              onCheckedChange={(v) => setIncludeClearedPast(Boolean(v))}
            />
            Show already-cleared past departures
          </label>
        </div>

        <ExportButton
          filename="offboarding_clearance_report"
          sheetName="Offboarding Clearance"
          data={filtered}
          allData={rows}
          columns={exportColumns}
        />
      </div>

      {/* Table */}
      <Skeleton loading={isLoading} label="Loading offboarding schedule">
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Employee</TableHead>
                <TableHead>End Date &amp; Urgency</TableHead>
                <TableHead>Hardware &amp; Licenses</TableHead>
                <TableHead>Login &amp; API Security</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SampleTableRows
                  columns={["avatar", "date", "number", "badge", "badge", "actions"]}
                  rowCount={4}
                />
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive py-10">
                    Failed to load offboarding records.
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-medium text-foreground">
                        No overdue or upcoming offboarding clearances in this window
                      </p>
                      <p className="text-xs max-w-md">
                        Employees with an End Date within the selected window (or past due dates
                        with lingering assets, licenses, logins, or API tokens) appear here
                        automatically.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const displayName = p.name || p.username || "Employee";
                  const assetCount = p.assets_count ?? 0;
                  const licCount = p.licenses_count ?? 0;
                  const apiCount = p.active_api_keys_count ?? 0;
                  const hasActiveLogin = Boolean(p.user_id && p.isActive !== false);

                  return (
                    <TableRow key={p._id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <ImageThumbnail
                            src={p.image}
                            alt={displayName}
                            fallback="person"
                            size="sm"
                            rounded="full"
                          />
                          <div>
                            <Link
                              href={`/people/${p._id}`}
                              className="font-semibold text-sm text-primary hover:underline"
                            >
                              {displayName}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {[p.title, p.department?.name].filter(Boolean).join(" · ") ||
                                p.email ||
                                "-"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs font-medium whitespace-nowrap">
                            {p.end_date ? format(new Date(p.end_date), "MMM d, yyyy") : "-"}
                          </div>
                          {renderUrgencyBadge(p.days_remaining)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={assetCount > 0 ? "secondary" : "outline"}
                              className={
                                assetCount > 0
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : "text-muted-foreground"
                              }
                            >
                              {assetCount} Asset(s)
                            </Badge>
                            {Number(p.total_asset_value ?? 0) > 0 && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                ${Number(p.total_asset_value).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {licCount > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              {licCount} software license(s)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.user_id ? (
                            hasActiveLogin ? (
                              <Badge
                                variant="outline"
                                className="text-[11px] border-rose-500/40 text-rose-600 dark:text-rose-400 gap-1"
                              >
                                <Lock className="h-3 w-3" />
                                Login Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                Login Suspended
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">
                              No Login
                            </Badge>
                          )}
                          {apiCount > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[11px] border-amber-500/40 text-amber-700 dark:text-amber-300 gap-1"
                            >
                              <KeyRound className="h-3 w-3" />
                              {apiCount} API Key(s)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.offboarding_risk === "critical" && (
                          <Badge variant="destructive" className="text-[11px]">
                            At Risk
                          </Badge>
                        )}
                        {p.offboarding_risk === "warning" && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[11px]">
                            Needs Review
                          </Badge>
                        )}
                        {p.offboarding_risk === "cleared" && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px]">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Cleared
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/people/${p._id}`}>
                            <Button size="icon" variant="outline" className="h-8 w-8" title="View Profile">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {permissions.canManagePeople && p.needs_clearance && (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => setSelectedPerson(p)}
                            >
                              <DoorOpen className="h-3.5 w-3.5" />
                              Complete Offboarding
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Skeleton>

      <OffboardPersonDialog
        person={selectedPerson}
        open={Boolean(selectedPerson)}
        onOpenChange={(open) => {
          if (!open) setSelectedPerson(null);
        }}
      />
    </div>
  );
}

