"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Loader2,
  LogOut,
  ScanLine,
  Search,
} from "lucide-react";
import { Skeleton } from "skullet/react";

import PeopleBox from "@/components/dropDowns/people.dropdown";
import StatusBox from "@/components/dropDowns/status.dropdown";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import { SampleTableRows, SelectOptionsSkullet } from "@/components/skeletons/AppSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";

export default function BulkCheckoutPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const selection = useBulkSelection();

  const [search, setSearch] = useState("");
  const [quickTagInput, setQuickTagInput] = useState("");
  const [assignedType, setAssignedType] = useState<"People" | "Location" | "Asset">("People");
  const [assignedTo, setAssignedTo] = useState("");
  const [statusName, setStatusName] = useState("Deployed");
  const [checkoutDate, setCheckoutDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expectedCheckinDate, setExpectedCheckinDate] = useState("");
  const [requireAcceptance, setRequireAcceptance] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSummary, setLastSummary] = useState<{
    message: string;
    checkedOut: Array<{ _id: string; asset_tag: string; asset_name?: string }>;
    skipped: Array<{ _id: string; asset_tag: string; reason: string }>;
  } | null>(null);

  const {
    data: availableAssets = [],
    isLoading: isLoadingAssets,
    isError: isAssetsError,
  } = useQuery<any[]>({
    queryKey: ["assets", "available-for-bulk-checkout"],
    queryFn: async () => {
      const res = await axios.get("/api/core/asset?assigned=false");
      return res.data?.data || [];
    },
  });

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<
    Array<{ _id: string; name: string }>
  >({
    queryKey: ["locations-for-bulk-checkout"],
    queryFn: async () => {
      const res = await axios.get("/api/settings/location");
      return res.data?.data || [];
    },
    enabled: assignedType === "Location",
  });

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableAssets;
    return availableAssets.filter((a) =>
      [a.asset_tag, a.asset_name, a.serial_number, a.asset_model?.name, a.location?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [availableAssets, search]);

  const handleQuickMatchTags = (e: React.FormEvent) => {
    e.preventDefault();
    const tokens = quickTagInput
      .split(/[\s,;]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.length === 0) return;

    const matchedIds: string[] = [];
    const tokenSet = new Set(tokens);
    for (const asset of availableAssets) {
      const tag = String(asset.asset_tag || "").toLowerCase();
      const serial = String(asset.serial_number || "").toLowerCase();
      if (tokenSet.has(tag) || tokenSet.has(serial)) {
        matchedIds.push(asset._id);
      }
    }

    if (matchedIds.length === 0) {
      toast({
        title: "No Matching Available Assets",
        description: "Check that entered tags exist and are currently unassigned.",
        variant: "destructive",
      });
      return;
    }

    selection.toggleAll(matchedIds, true);
    setQuickTagInput("");
    toast({
      title: "Assets Selected",
      description: `Added ${matchedIds.length} available asset(s) to checkout selection.`,
    });
  };

  const selectedIds = useMemo(() => {
    const availableIdSet = new Set(availableAssets.map((a) => String(a._id)));
    return Array.from(selection.selectedIds).filter((id) => availableIdSet.has(id));
  }, [availableAssets, selection.selectedIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast({
        title: "No Assets Selected",
        description: "Select at least one unassigned asset from the table or scanner input.",
        variant: "destructive",
      });
      return;
    }
    if (!assignedTo) {
      toast({
        title: "Recipient Required",
        description: "Choose a user, location, or parent asset to assign.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/core/asset/bulk-checkout", {
        assetIds: selectedIds,
        assigned_type: assignedType,
        assigned_to: assignedTo,
        statusName,
        checkout_date: checkoutDate,
        expected_checkin_date: expectedCheckinDate || undefined,
        require_acceptance: requireAcceptance,
        notes,
      });

      const payload = res.data?.data;
      setLastSummary({
        message: res.data?.message || "Bulk checkout completed.",
        checkedOut: payload?.checkedOut || [],
        skipped: payload?.skipped || [],
      });

      toast({
        title: "Bulk Checkout Complete",
        description: res.data?.message,
      });

      selection.clear();
      setNotes("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assets"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
        queryClient.invalidateQueries({ queryKey: ["needs-attention"] }),
        queryClient.invalidateQueries({ queryKey: ["acceptances"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["status"] }),
      ]);
    } catch (err) {
      toast({
        title: "Bulk Checkout Failed",
        description: getClientErrorMessage(err, "Unable to complete bulk checkout."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[1.75em] p-5 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border bg-muted/50 flex items-center justify-center shrink-0">
            <CheckSquare className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bulk Checkout</h1>
            <p className="text-xs text-muted-foreground">
              Assign multiple available hardware units to a person, location, or parent asset in one batch.
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

      {lastSummary && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{lastSummary.message}</span>
          </div>
          {lastSummary.checkedOut.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lastSummary.checkedOut.map((item) => (
                <Link key={item._id} href={`/assets/view/${item._id}`}>
                  <Badge variant="outline" className="font-mono hover:bg-muted">
                    #{item.asset_tag}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_380px] gap-6 items-start">
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Available Inventory Pool</h2>
              <p className="text-xs text-muted-foreground">
                {availableAssets.length} unassigned asset(s) ready ·{" "}
                <span className="font-semibold text-foreground">{selectedIds.length} selected</span>
              </p>
            </div>

            {selectedIds.length > 0 && (
              <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={selection.clear}>
                Clear Selection ({selectedIds.length})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Filter by tag, name, serial, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <form onSubmit={handleQuickMatchTags} className="flex items-center gap-2">
              <div className="relative flex-1">
                <ScanLine className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Scan or paste tags (comma separated)..."
                  value={quickTagInput}
                  onChange={(e) => setQuickTagInput(e.target.value)}
                  className="pl-9 font-mono text-xs"
                />
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={!quickTagInput.trim()}>
                Select
              </Button>
            </form>
          </div>

          <Skeleton
            id="bulk-checkout-available-table"
            loading={isLoadingAssets}
            label="Loading available assets"
            empty={!isLoadingAssets && !isAssetsError && filteredAssets.length === 0}
            emptyMessage={
              <div className="rounded-xl border py-12 text-center text-sm text-muted-foreground">
                No unassigned assets match your filter.
              </div>
            }
            error={
              !isLoadingAssets && isAssetsError ? (
                <div className="rounded-xl border py-10 text-center text-sm text-red-500">
                  Failed to load available assets.
                </div>
              ) : undefined
            }
          >
            <div className="rounded-xl border overflow-x-auto max-h-[540px]">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selection.headerCheckState(filteredAssets.map((a) => a._id))}
                        onCheckedChange={(checked) =>
                          selection.toggleAll(
                            filteredAssets.map((a) => a._id),
                            !!checked
                          )
                        }
                        aria-label="Select all available assets"
                      />
                    </TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAssets ? (
                    <SampleTableRows
                      columns={["checkbox", "subtext", "text", "mono", "badge", "text"]}
                      rowCount={6}
                    />
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset._id}>
                        <TableCell>
                          <Checkbox
                            checked={selection.isSelected(asset._id)}
                            onCheckedChange={(checked) =>
                              selection.toggleOne(asset._id, !!checked)
                            }
                            aria-label={`Select ${asset.asset_tag}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <ImageThumbnail
                              src={asset.image || asset.asset_model?.image}
                              alt={asset.asset_name || asset.asset_tag}
                              fallback="asset"
                              size="sm"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/assets/view/${asset._id}`}
                                className="font-mono text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 hover:underline block"
                              >
                                #{asset.asset_tag}
                              </Link>
                              <p className="text-xs font-medium truncate max-w-[180px]">
                                {asset.asset_name || "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{asset.asset_model?.name || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{asset.serial_number || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">
                            {asset.status?.name || "Ready"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {asset.location?.name || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Skeleton>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border bg-card p-5 space-y-4 xl:sticky xl:top-4"
        >
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-semibold">Assignment Details</h2>
            <Badge variant={selectedIds.length > 0 ? "default" : "outline"} className="font-mono">
              {selectedIds.length} selected
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label>Checkout To *</Label>
            <Select
              value={assignedType}
              onValueChange={(v) => {
                setAssignedType(v as "People" | "Location" | "Asset");
                setAssignedTo("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="People">Person / Employee</SelectItem>
                <SelectItem value="Location">Location</SelectItem>
                <SelectItem value="Asset">Parent Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              {assignedType === "People"
                ? "Select Recipient *"
                : assignedType === "Location"
                ? "Select Target Location *"
                : "Select Parent Asset *"}
            </Label>
            {assignedType === "People" ? (
              <PeopleBox value={assignedTo} onChange={setAssignedTo} placeholder="Choose person..." />
            ) : assignedType === "Location" ? (
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose location..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectOptionsSkullet
                    id="bulk-checkout-locations"
                    isLoading={isLoadingLocations}
                    isEmpty={!isLoadingLocations && locations.length === 0}
                    emptyText="No locations found"
                  >
                    {locations.map((loc) => (
                      <SelectItem key={loc._id} value={loc._id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectOptionsSkullet>
                </SelectContent>
              </Select>
            ) : (
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose parent asset..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectOptionsSkullet
                    id="bulk-checkout-parent-assets"
                    isLoading={isLoadingAssets}
                    isEmpty={!isLoadingAssets && availableAssets.length === 0}
                    emptyText="No assets available"
                  >
                    {availableAssets.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        #{a.asset_tag} — {a.asset_name || a.asset_model?.name || "Asset"}
                      </SelectItem>
                    ))}
                  </SelectOptionsSkullet>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Target Status</Label>
            <StatusBox value={statusName} onChange={setStatusName} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-checkout-date">Checkout Date</Label>
              <DatePicker
                id="bulk-checkout-date"
                value={checkoutDate}
                onChange={setCheckoutDate}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-expected-checkin">Expected Checkin</Label>
              <DatePicker
                id="bulk-expected-checkin"
                value={expectedCheckinDate}
                onChange={setExpectedCheckinDate}
                placeholder="Optional"
              />
            </div>
          </div>

          {assignedType === "People" && (
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="bulk-require-acceptance"
                checked={requireAcceptance}
                onCheckedChange={(v) => setRequireAcceptance(Boolean(v))}
              />
              <Label htmlFor="bulk-require-acceptance" className="text-xs font-normal cursor-pointer">
                Create pending EULA acceptance record(s) for assignee
              </Label>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bulk-checkout-notes">Notes</Label>
            <Textarea
              id="bulk-checkout-notes"
              rows={2}
              placeholder="Onboarding kit, project deployment reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-1.5"
            disabled={isSubmitting || selectedIds.length === 0 || !assignedTo}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {isSubmitting
              ? "Checking out..."
              : `Check Out ${selectedIds.length || ""} Asset${selectedIds.length === 1 ? "" : "s"}`}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Scheduled date preview:{" "}
            {checkoutDate ? format(new Date(checkoutDate), "MMM d, yyyy") : "Today"}
          </p>
        </form>
      </div>
    </div>
  );
}

