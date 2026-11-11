"use client";

import React, { useState } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SelectOptionsSkullet } from "@/components/skeletons/AppSkeletons";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";

const MAINTENANCE_TYPES = [
  "Maintenance",
  "Repair",
  "Upgrade",
  "PAT Test",
  "Calibration",
  "Software Support",
  "Hardware Support",
] as const;

interface AssetAuditDialogProps {
  assetId: string;
  assetTag: string;
  currentLocationId?: string;
  trigger?: React.ReactNode;
}

export function AssetAuditDialog({
  assetId,
  assetTag,
  currentLocationId,
  trigger,
}: AssetAuditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState(currentLocationId || "keep");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<
    Array<{ _id: string; name: string }>
  >({
    queryKey: ["locations-for-audit-dialog"],
    queryFn: async () => {
      const res = await axios.get("/api/settings/location");
      return res.data.data || [];
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = {
        notes: notes.trim() || "Physical asset audit verified.",
      };
      if (locationId && locationId !== "keep") {
        payload.location = locationId;
      }

      const res = await axios.post(`/api/core/asset/${assetId}/audit`, payload);
      toast({
        title: "Audit Logged",
        description: res.data.message || `Asset ${assetTag} marked audited.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["asset", assetId] }),
        queryClient.invalidateQueries({ queryKey: ["assets"] }),
        queryClient.invalidateQueries({ queryKey: ["needs-attention"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
        queryClient.invalidateQueries({ queryKey: ["reports-maintenance"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
      ]);

      setNotes("");
      setOpen(false);
    } catch (err) {
      toast({
        title: "Audit Failed",
        description: getClientErrorMessage(err, "Unable to record physical audit."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Log Audit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Record Physical Audit
          </DialogTitle>
          <DialogDescription>
            Confirm physical inspection for <strong className="font-mono">#{assetTag}</strong> and
            schedule next annual audit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Verified Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Keep current location" />
              </SelectTrigger>
              <SelectContent>
                <SelectOptionsSkullet
                  id="audit-locations-select"
                  isLoading={isLoadingLocations}
                >
                  <SelectItem value="keep">Keep current location</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc._id} value={loc._id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectOptionsSkullet>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-notes">Audit Notes</Label>
            <Textarea
              id="audit-notes"
              rows={3}
              placeholder="Verified tag condition, battery health, and physical custody..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Audit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AssetQuickMaintenanceDialogProps {
  assetId: string;
  assetTag: string;
  trigger?: React.ReactNode;
}

export function AssetQuickMaintenanceDialog({
  assetId,
  assetTag,
  trigger,
}: AssetQuickMaintenanceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState<string>("Maintenance");
  const [supplierId, setSupplierId] = useState("none");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [cost, setCost] = useState("0");
  const [isWarranty, setIsWarranty] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery<
    Array<{ _id: string; name: string }>
  >({
    queryKey: ["suppliers-for-asset-maint-dialog"],
    queryFn: async () => {
      const res = await axios.get("/api/settings/supplier");
      return res.data.data || [];
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please provide a maintenance title.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post("/api/core/maintenance", {
        asset: assetId,
        supplier: supplierId !== "none" ? supplierId : undefined,
        maintenance_type: maintenanceType,
        title: title.trim(),
        is_warranty: isWarranty,
        start_date: startDate,
        expected_completion_date: expectedDate || undefined,
        cost: Number(cost) || 0,
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Maintenance Logged",
        description: `Service log recorded for #${assetTag}.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["asset", assetId] }),
        queryClient.invalidateQueries({ queryKey: ["maintenances"] }),
        queryClient.invalidateQueries({ queryKey: ["needs-attention"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
        queryClient.invalidateQueries({ queryKey: ["reports-maintenance"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
      ]);

      setTitle("");
      setExpectedDate("");
      setCost("0");
      setIsWarranty(false);
      setNotes("");
      setSupplierId("none");
      setOpen(false);
    } catch (err) {
      toast({
        title: "Failed",
        description: getClientErrorMessage(err, "Could not log maintenance record."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Log Maintenance
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Log Asset Maintenance
          </DialogTitle>
          <DialogDescription>
            Schedule or record a service ticket for <strong className="font-mono">#{assetTag}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <SelectOptionsSkullet
                    id="asset-maint-suppliers-select"
                    isLoading={isLoadingSuppliers}
                  >
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectOptionsSkullet>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asset-m-title">Title *</Label>
            <Input
              id="asset-m-title"
              placeholder="e.g., Battery replacement, display calibration..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-m-start">Start Date</Label>
              <DatePicker
                id="asset-m-start"
                value={startDate}
                onChange={setStartDate}
                placeholder="Start date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-m-due">Expected Completion</Label>
              <DatePicker
                id="asset-m-due"
                value={expectedDate}
                onChange={setExpectedDate}
                placeholder="Target date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-m-cost">Cost</Label>
              <Input
                id="asset-m-cost"
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
              id="asset-m-warranty"
              checked={isWarranty}
              onCheckedChange={(v) => setIsWarranty(Boolean(v))}
            />
            <Label htmlFor="asset-m-warranty" className="text-sm font-normal cursor-pointer">
              Covered under warranty
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asset-m-notes">Notes</Label>
            <Textarea
              id="asset-m-notes"
              rows={2}
              placeholder="RMA ticket ID, vendor diagnostics, parts replaced..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
  );
}

