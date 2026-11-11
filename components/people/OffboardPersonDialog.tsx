"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  DoorOpen,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";

export interface OffboardTargetPerson {
  _id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  end_date?: string | Date | null;
  assets_count?: number;
  total_asset_value?: number;
  licenses_count?: number;
  user_id?: string | null;
  isActive?: boolean | null;
  active_api_keys_count?: number;
}

export function OffboardPersonDialog({
  person,
  open,
  onOpenChange,
  onCompleted,
}: {
  person: OffboardTargetPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [checkinAssets, setCheckinAssets] = useState(true);
  const [reclaimLicenses, setReclaimLicenses] = useState(true);
  const [disableLogin, setDisableLogin] = useState(true);
  const [revokeApiKeys, setRevokeApiKeys] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const assetsCount = person?.assets_count ?? 0;
  const assetValue = Number(person?.total_asset_value ?? 0);
  const licensesCount = person?.licenses_count ?? 0;
  const hasActiveLogin = Boolean(person?.user_id && person?.isActive !== false);
  const apiKeysCount = person?.active_api_keys_count ?? 0;

  useEffect(() => {
    if (open && person) {
      setCheckinAssets((person.assets_count ?? 0) > 0);
      setReclaimLicenses((person.licenses_count ?? 0) > 0);
      setDisableLogin(Boolean(person.user_id && person.isActive !== false));
      setRevokeApiKeys((person.active_api_keys_count ?? 0) > 0);
      setNotes("");
    }
  }, [open, person]);

  if (!person) return null;

  const displayName =
    person.name ||
    `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
    "Employee";

  const nothingSelected =
    !checkinAssets && !reclaimLicenses && !disableLogin && !revokeApiKeys;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nothingSelected) {
      toast({
        title: "No actions selected",
        description: "Select at least one offboarding cleanup step.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/core/people/${person._id}/offboard`, {
        checkinAssets,
        reclaimLicenses,
        disableLogin,
        revokeApiKeys,
        notes: notes.trim(),
      });

      const receipt = res.data?.data ?? {};
      toast({
        title: `Offboarding Cleared: ${displayName}`,
        description: `${receipt.assetsCheckedIn ?? 0} asset(s) returned, ${
          receipt.licensesReclaimed ?? 0
        } license(s) reclaimed, ${receipt.loginsDisabled ?? 0} login(s) disabled, ${
          receipt.apiKeysRevoked ?? 0
        } API key(s) revoked.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["people-offboarding"] }),
        queryClient.invalidateQueries({ queryKey: ["people-sidebar-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["assets"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
        queryClient.invalidateQueries({ queryKey: ["person", person._id] }),
      ]);

      onOpenChange(false);
      onCompleted?.();
    } catch (error) {
      toast({
        title: "Offboarding Failed",
        description: getClientErrorMessage(error, "Unable to complete offboarding clearance."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-amber-500" />
            Complete Offboarding: {displayName}
          </DialogTitle>
          <DialogDescription>
            Execute all hardware returns, license reclamation, login suspension, and API token
            revocation in one audited workflow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4">
          {/* Risk Exposure Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Laptop className="h-3.5 w-3.5" />
                Hardware
              </div>
              <p className="text-sm font-semibold mt-0.5">
                {assetsCount} ({assetValue > 0 ? `$${assetValue.toLocaleString()}` : "$0"})
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" />
                Licenses
              </div>
              <p className="text-sm font-semibold mt-0.5">{licensesCount} seat(s)</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Portal Login
              </div>
              <p className="text-sm font-semibold mt-0.5">
                {hasActiveLogin ? "Enabled" : person.user_id ? "Suspended" : "None"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" />
                API Keys
              </div>
              <p className="text-sm font-semibold mt-0.5">{apiKeysCount} active</p>
            </div>
          </div>

          {/* Clearance Checklist */}
          <div className="space-y-2.5 rounded-xl border p-3.5 bg-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Automated Clearance Steps
            </p>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox
                checked={checkinAssets}
                disabled={assetsCount === 0}
                onCheckedChange={(v) => setCheckinAssets(Boolean(v))}
                className="mt-0.5"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-medium text-foreground">
                  Check in {assetsCount} assigned asset(s)
                </span>
                <p className="text-muted-foreground">
                  Unassigns equipment and resets asset status to Ready to Deploy.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox
                checked={reclaimLicenses}
                disabled={licensesCount === 0}
                onCheckedChange={(v) => setReclaimLicenses(Boolean(v))}
                className="mt-0.5"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-medium text-foreground">
                  Reclaim {licensesCount} software license(s)
                </span>
                <p className="text-muted-foreground">
                  Releases seat allocations so software can be reassigned.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox
                checked={disableLogin}
                disabled={!hasActiveLogin}
                onCheckedChange={(v) => setDisableLogin(Boolean(v))}
                className="mt-0.5"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-medium text-foreground">
                  Suspend AssetsVista login access
                </span>
                <p className="text-muted-foreground">
                  Immediately blocks browser sign-in while preserving audit history.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox
                checked={revokeApiKeys}
                disabled={apiKeysCount === 0}
                onCheckedChange={(v) => setRevokeApiKeys(Boolean(v))}
                className="mt-0.5"
              />
              <div className="text-xs leading-relaxed">
                <span className="font-medium text-foreground">
                  Revoke {apiKeysCount} active Personal Access Token(s)
                </span>
                <p className="text-muted-foreground">
                  Immediately invalidates all API scripts and Bearer tokens owned by this user.
                </p>
              </div>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offboard-notes" className="text-xs">
              Handover / Audit Notes (Optional)
            </Label>
            <Input
              id="offboard-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Hardware returned to Austin IT desk"
              maxLength={300}
            />
          </div>

          {assetsCount === 0 && licensesCount === 0 && !hasActiveLogin && apiKeysCount === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All assets, licenses, login access, and tokens are already cleared.
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Selected actions execute immediately and record entries in the Activity Log.
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || nothingSelected}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  Atomic
                </Badge>
              )}
              Complete Offboarding
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

