"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Plus,
  ScanLine,
  Trash2,
} from "lucide-react";

import { ExportButton } from "@/components/ExportButton";
import { SelectOptionsSkullet } from "@/components/skeletons/AppSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";
import type { ExportColumnDef } from "@/lib/exportData";

interface AuditResultRow {
  key: string;
  scannedAt: string;
  identifier: string;
  _id?: string;
  asset_tag?: string;
  asset_name?: string;
  status?: string;
  previousLocation?: string;
  newLocation?: string;
  nextAuditDate?: string;
  found: boolean;
}

export default function ScannerBulkAuditPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  const [instantMode, setInstantMode] = useState(true);
  const [scanInput, setScanInput] = useState("");
  const [batchPaste, setBatchPaste] = useState("");
  const [queue, setQueue] = useState<string[]>([]);
  const [locationId, setLocationId] = useState("keep");
  const [auditIntervalMonths, setAuditIntervalMonths] = useState("12");
  const [notes, setNotes] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [results, setResults] = useState<AuditResultRow[]>([]);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<
    Array<{ _id: string; name: string }>
  >({
    queryKey: ["locations-for-scanner-bulk-audit"],
    queryFn: async () => {
      const res = await axios.get("/api/settings/location");
      return res.data?.data || [];
    },
  });

  const runAuditRequest = async (identifiers: string[]) => {
    if (identifiers.length === 0 || isAuditing) return;
    setIsAuditing(true);
    try {
      const res = await axios.post("/api/core/asset/bulk-audit", {
        identifiers,
        locationId: locationId !== "keep" ? locationId : undefined,
        auditIntervalMonths: Math.max(1, Number(auditIntervalMonths) || 12),
        notes: notes.trim() || undefined,
      });

      const payload = res.data?.data;
      const nowIso = new Date().toISOString();
      const newRows: AuditResultRow[] = [
        ...(payload?.audited || []).map((item: any) => ({
          key: `${Date.now()}-${item._id}`,
          scannedAt: nowIso,
          identifier: item.identifier,
          _id: item._id,
          asset_tag: item.asset_tag,
          asset_name: item.asset_name,
          status: item.status,
          previousLocation: item.previousLocation,
          newLocation: item.newLocation,
          nextAuditDate: item.nextAuditDate,
          found: true,
        })),
        ...(payload?.notFound || []).map((missingTag: string, idx: number) => ({
          key: `${Date.now()}-missing-${idx}-${missingTag}`,
          scannedAt: nowIso,
          identifier: missingTag,
          found: false,
        })),
      ];

      setResults((prev) => [...newRows, ...prev]);
      toast({
        title: payload?.auditedCount > 0 ? "Audit Recorded" : "No Assets Matched",
        description: res.data?.message,
        variant: payload?.auditedCount > 0 ? "default" : "destructive",
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assets"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["needs-attention"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
        queryClient.invalidateQueries({ queryKey: ["reports-maintenance"] }),
      ]);
    } catch (err) {
      toast({
        title: "Bulk Audit Failed",
        description: getClientErrorMessage(err, "Unable to audit scanned assets."),
        variant: "destructive",
      });
    } finally {
      setIsAuditing(false);
      setTimeout(() => scanInputRef.current?.focus(), 20);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = scanInput.trim();
    if (!token) return;
    setScanInput("");

    if (instantMode) {
      await runAuditRequest([token]);
    } else {
      setQueue((prev) => (prev.includes(token) ? prev : [...prev, token]));
      setTimeout(() => scanInputRef.current?.focus(), 20);
    }
  };

  const handleAddBatchPaste = () => {
    const parsed = batchPaste
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;

    if (instantMode) {
      setBatchPaste("");
      void runAuditRequest(parsed);
      return;
    }

    setQueue((prev) => Array.from(new Set([...prev, ...parsed])));
    setBatchPaste("");
  };

  const auditedCount = results.filter((r) => r.found).length;
  const notFoundCount = results.filter((r) => !r.found).length;

  const exportColumns: ExportColumnDef<AuditResultRow>[] = [
    { header: "Time", accessor: (r) => format(new Date(r.scannedAt), "yyyy-MM-dd HH:mm:ss") },
    { header: "Scanned Input", accessor: (r) => r.identifier },
    { header: "Asset Tag", accessor: (r) => r.asset_tag || "-" },
    { header: "Asset Name", accessor: (r) => r.asset_name || "-" },
    { header: "Location", accessor: (r) => r.newLocation || "-" },
    {
      header: "Next Audit Date",
      accessor: (r) => (r.nextAuditDate ? format(new Date(r.nextAuditDate), "yyyy-MM-dd") : "-"),
    },
    { header: "Result", accessor: (r) => (r.found ? "Audited" : "Not Found") },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[1.75em] p-5 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border bg-muted/50 flex items-center justify-center shrink-0">
            <ClipboardCheck className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Scanner Bulk Audit</h1>
            <p className="text-xs text-muted-foreground">
              Stream physical barcode scans or paste tag lists to stamp last audit dates and update verified locations.
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

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="audit-instant-mode"
              checked={instantMode}
              onCheckedChange={(v) => setInstantMode(Boolean(v))}
            />
            <Label htmlFor="audit-instant-mode" className="text-xs font-medium cursor-pointer">
              Audit immediately on every scan (Enter)
            </Label>
          </div>

          <form onSubmit={handleScanSubmit} className="space-y-2">
            <Label htmlFor="scanner-audit-input">Scan Tag / Serial Number</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  ref={scanInputRef}
                  id="scanner-audit-input"
                  placeholder="Scan barcode & press Enter..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  disabled={isAuditing}
                  className="pl-9 font-mono"
                />
              </div>
              <Button type="submit" size="icon" variant="outline" disabled={isAuditing || !scanInput.trim()}>
                {isAuditing && instantMode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <Label htmlFor="audit-batch-paste">Paste Multiple Tags / Serials</Label>
            <Textarea
              id="audit-batch-paste"
              rows={3}
              placeholder="AST-0001, AST-0002, SN12345..."
              value={batchPaste}
              onChange={(e) => setBatchPaste(e.target.value)}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isAuditing || !batchPaste.trim()}
              onClick={handleAddBatchPaste}
            >
              {instantMode ? "Audit Pasted Tags Now" : "Add Pasted Tags to Queue"}
            </Button>
          </div>

          {!instantMode && (
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Pending Scan Queue ({queue.length})</span>
                {queue.length > 0 && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground underline"
                    onClick={() => setQueue([])}
                  >
                    Clear
                  </button>
                )}
              </div>
              {queue.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {queue.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="font-mono text-[11px] cursor-pointer"
                      onClick={() => setQueue((prev) => prev.filter((x) => x !== tag))}
                      title="Click to remove"
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Queue is empty.</p>
              )}
              <Button
                type="button"
                className="w-full gap-1.5"
                disabled={isAuditing || queue.length === 0}
                onClick={async () => {
                  const items = [...queue];
                  setQueue([]);
                  await runAuditRequest(items);
                }}
              >
                {isAuditing && <Loader2 className="h-4 w-4 animate-spin" />}
                Audit Queued Assets ({queue.length})
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Verified Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Keep current location" />
              </SelectTrigger>
              <SelectContent>
                <SelectOptionsSkullet id="scanner-audit-locations" isLoading={isLoadingLocations}>
                  <SelectItem value="keep">Keep existing asset location</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc._id} value={loc._id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectOptionsSkullet>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="audit-interval-months">Next Audit Cycle (Months)</Label>
              <Input
                id="audit-interval-months"
                type="number"
                min={1}
                max={60}
                value={auditIntervalMonths}
                onChange={(e) => setAuditIntervalMonths(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scanner-audit-notes">Audit Notes</Label>
            <Textarea
              id="scanner-audit-notes"
              rows={2}
              placeholder="Q4 floor sweep, label legible..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="font-mono">
                Processed: {results.length}
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono"
              >
                Audited: {auditedCount}
              </Badge>
              {notFoundCount > 0 && (
                <Badge variant="destructive" className="font-mono">
                  Not Found: {notFoundCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {results.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1 text-muted-foreground"
                  onClick={() => setResults([])}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Log
                </Button>
              )}
              <ExportButton
                filename="scanner_bulk_audit_results"
                sheetName="Bulk Audit"
                data={results}
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
                  <TableHead>Verified Location</TableHead>
                  <TableHead>Next Audit Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                      Scan asset tags or paste a list on the left to record audits in bulk.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {format(new Date(row.scannedAt), "HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.identifier}</TableCell>
                      <TableCell className="text-xs">
                        {row._id ? (
                          <Link
                            href={`/assets/view/${row._id}`}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            #{row.asset_tag} — {row.asset_name || "Asset"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.found ? row.newLocation : "—"}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {row.nextAuditDate
                          ? format(new Date(row.nextAuditDate), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.found ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Audited
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

