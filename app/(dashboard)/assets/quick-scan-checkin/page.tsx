"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react";

import StatusBox from "@/components/dropDowns/status.dropdown";
import { ExportButton } from "@/components/ExportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";
import type { ExportColumnDef } from "@/lib/exportData";

interface ScanCheckinEntry {
  key: string;
  scannedAt: string;
  identifier: string;
  assetId?: string;
  assetTag?: string;
  assetName?: string;
  serialNumber?: string;
  previousAssignee?: string | null;
  newStatus?: string;
  outcome: "checked_in" | "already_available" | "not_found";
  message: string;
}

export default function QuickScanCheckinPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [statusName, setStatusName] = useState("Ready to Deploy");
  const [notes, setNotes] = useState("");
  const [keepFocus, setKeepFocus] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [entries, setEntries] = useState<ScanCheckinEntry[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = identifier.trim();
    if (!token || isScanning) return;

    setIsScanning(true);
    try {
      const res = await axios.post("/api/core/asset/scan-checkin", {
        identifier: token,
        statusName,
        notes,
      });

      const d = res.data?.data;
      const entry: ScanCheckinEntry = {
        key: `${Date.now()}-${Math.random()}`,
        scannedAt: new Date().toISOString(),
        identifier: token,
        assetId: d?._id ? String(d._id) : undefined,
        assetTag: d?.asset_tag,
        assetName: d?.asset_name,
        serialNumber: d?.serial_number,
        previousAssignee: d?.previousAssignee || null,
        newStatus: d?.newStatus || statusName,
        outcome: d?.wasAssigned ? "checked_in" : "already_available",
        message: res.data?.message || "Checked in",
      };

      setEntries((prev) => [entry, ...prev]);
      setIdentifier("");

      toast({
        title: d?.wasAssigned ? "Checked In" : "Status Updated",
        description: entry.message,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assets"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
        queryClient.invalidateQueries({ queryKey: ["needs-attention"] }),
        queryClient.invalidateQueries({ queryKey: ["acceptances"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
        queryClient.invalidateQueries({ queryKey: ["status"] }),
      ]);
    } catch (err) {
      const msg = getClientErrorMessage(err, `No asset found matching '${token}'.`);
      setEntries((prev) => [
        {
          key: `${Date.now()}-${Math.random()}`,
          scannedAt: new Date().toISOString(),
          identifier: token,
          outcome: "not_found",
          message: msg,
        },
        ...prev,
      ]);
      setIdentifier("");
      toast({
        title: "Scan Checkin Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      if (keepFocus) {
        setTimeout(() => inputRef.current?.focus(), 20);
      }
    }
  };

  const checkedInCount = entries.filter((e) => e.outcome === "checked_in").length;
  const availableCount = entries.filter((e) => e.outcome === "already_available").length;
  const errorCount = entries.filter((e) => e.outcome === "not_found").length;

  const exportColumns: ExportColumnDef<ScanCheckinEntry>[] = [
    { header: "Time", accessor: (r) => format(new Date(r.scannedAt), "yyyy-MM-dd HH:mm:ss") },
    { header: "Scanned Input", accessor: (r) => r.identifier },
    { header: "Asset Tag", accessor: (r) => r.assetTag || "-" },
    { header: "Asset Name", accessor: (r) => r.assetName || "-" },
    { header: "Previous Assignee", accessor: (r) => r.previousAssignee || "Unassigned" },
    { header: "Status", accessor: (r) => r.newStatus || "-" },
    { header: "Outcome", accessor: (r) => r.outcome },
    { header: "Details", accessor: (r) => r.message },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[1.75em] p-5 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border bg-muted/50 flex items-center justify-center shrink-0">
            <ScanLine className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Quick Scan Checkin</h1>
            <p className="text-xs text-muted-foreground">
              Scan barcode tags or enter Asset Tags / Serial Numbers to return equipment back to stock immediately.
            </p>
          </div>
        </div>
        <Link href="/assets/listall">
          <Button variant="outline" size="sm" className="rounded-full gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            All Assets
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <form onSubmit={handleScanSubmit} className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="scan-checkin-input">Asset Tag / Serial Number *</Label>
            <Input
              ref={inputRef}
              id="scan-checkin-input"
              placeholder="Scan barcode or type tag & press Enter..."
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isScanning}
              autoComplete="off"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Target Checkin Status</Label>
            <StatusBox value={statusName} onChange={setStatusName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scan-checkin-notes">Optional Checkin Note</Label>
            <Input
              id="scan-checkin-notes"
              placeholder="e.g., Returned to IT desk"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="keep-focus-checkin"
              checked={keepFocus}
              onCheckedChange={(v) => setKeepFocus(Boolean(v))}
            />
            <Label htmlFor="keep-focus-checkin" className="text-xs font-normal cursor-pointer">
              Keep scanner input focused after each scan
            </Label>
          </div>

          <Button type="submit" className="w-full gap-1.5" disabled={isScanning || !identifier.trim()}>
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Check In Asset
          </Button>
        </form>

        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="font-mono">
                Scanned: {entries.length}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono">
                Checked In: {checkedInCount}
              </Badge>
              <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-300 font-mono">
                Already Available: {availableCount}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="font-mono">
                  Not Found: {errorCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {entries.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1 text-muted-foreground"
                  onClick={() => setEntries([])}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Log
                </Button>
              )}
              <ExportButton
                filename="quick_scan_checkin_session"
                sheetName="Scan Checkin"
                data={entries}
                columns={exportColumns}
              />
            </div>
          </div>

          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Scanned</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Previous Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                      Ready to scan. Point your barcode scanner or enter an Asset Tag above and press Enter.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {format(new Date(row.scannedAt), "HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.identifier}</TableCell>
                      <TableCell className="text-xs">
                        {row.assetId ? (
                          <Link
                            href={`/assets/view/${row.assetId}`}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            #{row.assetTag} — {row.assetName || "Asset"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.previousAssignee || <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-xs">{row.newStatus || "—"}</TableCell>
                      <TableCell>
                        {row.outcome === "checked_in" ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Checked In
                          </Badge>
                        ) : row.outcome === "already_available" ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-blue-500/40 text-blue-700 dark:text-blue-300"
                          >
                            Reset to Pool
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Not Found
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

