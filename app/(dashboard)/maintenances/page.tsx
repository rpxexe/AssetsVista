"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ExportButton } from "@/components/ExportButton";
import type { ExportColumnDef } from "@/lib/exportData";

interface MaintenanceRow {
  _id: string;
  title: string;
  maintenance_type: string;
  is_warranty?: boolean;
  start_date?: string;
  expected_completion_date?: string;
  completed_at?: string | null;
  cost?: number;
  notes?: string;
  asset?: {
    _id: string;
    asset_tag?: string;
    asset_name?: string;
    serial_number?: string;
  } | null;
  supplier?: {
    _id: string;
    name?: string;
  } | null;
}

const MAINTENANCE_TYPES = [
  "Maintenance",
  "Repair",
  "Upgrade",
  "PAT Test",
  "Calibration",
  "Software Support",
  "Hardware Support",
];

function isOverdue(row: MaintenanceRow): boolean {
  if (row.completed_at || !row.expected_completion_date) return false;
  const due = new Date(row.expected_completion_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function MaintenancesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<"all" | "open" | "overdue" | "completed">("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create form state
  const [assetId, setAssetId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Maintenance");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState("");
  const [cost, setCost] = useState("0");
  const [isWarranty, setIsWarranty] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: rows = [], isLoading } = useQuery<MaintenanceRow[]>({
    queryKey: ["maintenances", statusTab],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusTab !== "all") params.status = statusTab;
      const res = await axios.get("/api/core/maintenance", { params });
      return res.data.data || [];
    },
  });

  const { data: assets = [] } = useQuery<
    Array<{ _id: string; asset_tag?: string; asset_name?: string }>
  >({
    queryKey: ["assets", "minimal-list"],
    queryFn: async () => {
      const res = await axios.get("/api/core/asset");
      return res.data.data || [];
    },
    enabled: dialogOpen,
  });

  const { data: suppliers = [] } = useQuery<Array<{ _id: string; name?: string }>>({
    queryKey: ["suppliers", "minimal-list"],
    queryFn: async () => {
      const res = await axios.get("/api/settings/supplier");
      return res.data.data || [];
    },
    enabled: dialogOpen,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const assetText = `${row.asset?.asset_tag || ""} ${row.asset?.asset_name || ""}`.toLowerCase();
      return (
        row.title.toLowerCase().includes(q) ||
        row.maintenance_type.toLowerCase().includes(q) ||
        assetText.includes(q) ||
        (row.supplier?.name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const exportColumns: ExportColumnDef<MaintenanceRow>[] = [
    { header: "Title", accessor: (r) => r.title },
    { header: "Type", accessor: (r) => r.maintenance_type },
    { header: "Asset Tag", accessor: (r) => r.asset?.asset_tag || "" },
    { header: "Asset Name", accessor: (r) => r.asset?.asset_name || "" },
    { header: "Supplier", accessor: (r) => r.supplier?.name || "" },
    {
      header: "Status",
      accessor: (r) => (r.completed_at ? "Completed" : isOverdue(r) ? "Overdue" : "Open"),
    },
    {
      header: "Start Date",
      accessor: (r) => (r.start_date ? format(new Date(r.start_date), "yyyy-MM-dd") : ""),
    },
    {
      header: "Expected Completion",
      accessor: (r) =>
        r.expected_completion_date
          ? format(new Date(r.expected_completion_date), "yyyy-MM-dd")
          : "",
    },
    {
      header: "Completed At",
      accessor: (r) => (r.completed_at ? format(new Date(r.completed_at), "yyyy-MM-dd") : ""),
    },
    { header: "Cost", accessor: (r) => r.cost ?? 0 },
    { header: "Warranty", accessor: (r) => (r.is_warranty ? "Yes" : "No") },
  ];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["maintenances"] });
    queryClient.invalidateQueries({ queryKey: ["needs-attention"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !title.trim()) {
      toast({
        title: "Missing details",
        description: "Please select an asset and provide a maintenance title.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post("/api/core/maintenance", {
        asset: assetId,
        supplier: supplierId && supplierId !== "none" ? supplierId : undefined,
        maintenance_type: maintenanceType,
        title: title.trim(),
        start_date: startDate || undefined,
        expected_completion_date: expectedDate || undefined,
        cost: Number(cost) || 0,
        is_warranty: isWarranty,
        notes: notes.trim() || undefined,
      });
      toast({ title: "Maintenance log created" });
      setDialogOpen(false);
      setTitle("");
      setNotes("");
      setCost("0");
      setIsWarranty(false);
      invalidateAll();
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to create maintenance"
        : "Failed to create maintenance";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (row: MaintenanceRow) => {
    setBusyId(row._id);
    try {
      const action = row.completed_at ? "reopen" : "complete";
      await axios.patch("/api/core/maintenance", { id: row._id, action });
      toast({
        title: action === "complete" ? "Marked completed" : "Maintenance reopened",
      });
      invalidateAll();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update maintenance status",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await axios.delete(`/api/core/maintenance?id=${encodeURIComponent(id)}`);
      toast({ title: "Maintenance deleted" });
      invalidateAll();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete maintenance",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex flex-wrap items-center justify-between gap-3 bg-card">
        <div className="flex items-center space-x-3">
          <Wrench strokeWidth={2.2} size={30} />
          <div>
            <h3 className="text-3xl font-semibold">Asset Maintenances</h3>
            <p className="text-xs text-muted-foreground">
              Log hardware repairs, calibrations, upgrades, warranty service &amp; due dates
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Log Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Log Asset Maintenance</DialogTitle>
              <DialogDescription>
                Schedule or record a repair, calibration, or hardware service ticket.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Asset *</Label>
                <Select value={assetId} onValueChange={setAssetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an asset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.asset_tag ? `#${a.asset_tag} - ` : ""}
                        {a.asset_name || "Unnamed Asset"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Maintenance Type</Label>
                  <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Supplier</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-title">Title *</Label>
                <Input
                  id="m-title"
                  placeholder="e.g., Screen replacement / Thermal paste service"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-start">Start Date</Label>
                  <Input
                    id="m-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-due">Expected Completion</Label>
                  <Input
                    id="m-due"
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-cost">Cost</Label>
                  <Input
                    id="m-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="m-warranty"
                  checked={isWarranty}
                  onCheckedChange={(v) => setIsWarranty(Boolean(v))}
                />
                <Label htmlFor="m-warranty" className="text-sm font-normal cursor-pointer">
                  Covered under warranty
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-notes">Notes</Label>
                <textarea
                  id="m-notes"
                  rows={3}
                  placeholder="Ticket reference, vendor RMA, diagnostic notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Maintenance
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(["all", "open", "overdue", "completed"] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={statusTab === tab ? "default" : "outline"}
              onClick={() => setStatusTab(tab)}
              className="capitalize"
            >
              {tab}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              placeholder="Search title, asset, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <ExportButton
            filename="maintenances"
            sheetName="Maintenances"
            data={filtered}
            allData={rows}
            columns={exportColumns}
            size="sm"
          />
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading maintenance logs...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                  No maintenance records found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const overdue = isOverdue(row);
                return (
                  <TableRow key={row._id}>
                    <TableCell className="text-xs font-medium">
                      {row.asset?._id ? (
                        <Link
                          href={`/assets/view/${row.asset._id}`}
                          className="hover:underline text-foreground"
                        >
                          {row.asset.asset_tag ? `#${row.asset.asset_tag} ` : ""}
                          {row.asset.asset_name || "Asset"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">{row.title}</div>
                      {row.is_warranty && (
                        <span className="text-[10px] text-muted-foreground">Warranty</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{row.maintenance_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.supplier?.name || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.start_date ? format(new Date(row.start_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.expected_completion_date
                        ? format(new Date(row.expected_completion_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.completed_at ? (
                        <Badge variant="secondary">Completed</Badge>
                      ) : overdue ? (
                        <Badge variant="default">Overdue</Badge>
                      ) : (
                        <Badge variant="outline">Open</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      ${Number(row.cost || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          disabled={busyId === row._id}
                          title={row.completed_at ? "Reopen maintenance" : "Mark completed"}
                          onClick={() => handleToggleComplete(row)}
                        >
                          {row.completed_at ? (
                            <RotateCcw className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          disabled={busyId === row._id}
                          title="Delete maintenance"
                          onClick={() => handleDelete(row._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

