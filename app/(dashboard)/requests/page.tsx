"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, ClipboardList, Loader2, Plus, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { RequestableItemType } from "@/models/CheckoutRequest.model";

interface RequestRow {
  _id: string;
  requester_name: string;
  requester_email?: string;
  item_type: RequestableItemType;
  item_id: string;
  item_name: string;
  item_tag?: string;
  quantity: number;
  status: "pending" | "fulfilled" | "canceled";
  notes?: string;
  createdAt?: string;
  requester?: {
    _id: string;
    name?: string;
    email?: string;
    employee_num?: string;
  } | null;
}

const ITEM_TYPE_OPTIONS: { value: RequestableItemType; label: string; endpoint: string }[] = [
  { value: "Asset", label: "Asset", endpoint: "/api/core/asset" },
  { value: "AssetModel", label: "Asset Model", endpoint: "/api/settings/assetmodel" },
  { value: "Accessory", label: "Accessory", endpoint: "/api/core/accessories" },
  { value: "Consumable", label: "Consumable", endpoint: "/api/core/consumables" },
  { value: "Component", label: "Component", endpoint: "/api/core/components" },
  { value: "License", label: "License", endpoint: "/api/core/license" },
];

export default function RequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<"pending" | "fulfilled" | "canceled" | "all">(
    "pending"
  );
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [itemType, setItemType] = useState<RequestableItemType>("Asset");
  const [itemId, setItemId] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const { data: rows = [], isLoading } = useQuery<RequestRow[]>({
    queryKey: ["requests", statusTab],
    queryFn: async () => {
      const res = await axios.get("/api/core/requests", {
        params: { status: statusTab },
      });
      return res.data.data || [];
    },
  });

  const activeEndpoint =
    ITEM_TYPE_OPTIONS.find((t) => t.value === itemType)?.endpoint || "/api/core/asset";

  const { data: catalogItems = [], isLoading: isLoadingCatalog } = useQuery<
    Array<{ _id: string; name?: string; asset_name?: string; asset_tag?: string }>
  >({
    queryKey: ["request-catalog", itemType],
    queryFn: async () => {
      const res = await axios.get(activeEndpoint);
      return res.data.data || [];
    },
    enabled: dialogOpen,
  });

  const { data: people = [] } = useQuery<
    Array<{ _id: string; name?: string; first_name?: string; last_name?: string }>
  >({
    queryKey: ["people", "minimal-list"],
    queryFn: async () => {
      const res = await axios.get("/api/core/people");
      return res.data.data || [];
    },
    enabled: dialogOpen,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.item_name.toLowerCase().includes(q) ||
        (r.item_tag || "").toLowerCase().includes(q) ||
        r.requester_name.toLowerCase().includes(q) ||
        r.item_type.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const exportColumns: ExportColumnDef<RequestRow>[] = [
    { header: "Item Type", accessor: (r) => r.item_type },
    { header: "Item", accessor: (r) => (r.item_tag ? `#${r.item_tag} - ${r.item_name}` : r.item_name) },
    { header: "Requester", accessor: (r) => r.requester?.name || r.requester_name },
    { header: "Quantity", accessor: (r) => r.quantity },
    { header: "Status", accessor: (r) => r.status },
    {
      header: "Requested At",
      accessor: (r) => (r.createdAt ? format(new Date(r.createdAt), "yyyy-MM-dd HH:mm") : ""),
    },
    { header: "Notes", accessor: (r) => r.notes || "" },
  ];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["requests"] });
    queryClient.invalidateQueries({ queryKey: ["needs-attention"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      toast({
        title: "Missing selection",
        description: "Please select an item to request.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post("/api/core/requests", {
        item_type: itemType,
        item_id: itemId,
        requester: requesterId && requesterId !== "self" ? requesterId : undefined,
        quantity: Math.max(1, Number(quantity) || 1),
        notes: notes.trim() || undefined,
      });
      toast({ title: "Request submitted" });
      setDialogOpen(false);
      setItemId("");
      setNotes("");
      setQuantity("1");
      invalidateAll();
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to create request"
        : "Failed to create request";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: "fulfill" | "cancel") => {
    setBusyId(id);
    try {
      await axios.patch("/api/core/requests", { id, action });
      toast({ title: action === "fulfill" ? "Request fulfilled" : "Request canceled" });
      invalidateAll();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update request",
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
          <ClipboardList strokeWidth={2.2} size={30} />
          <div>
            <h3 className="text-3xl font-semibold">Checkout Requests</h3>
            <p className="text-xs text-muted-foreground">
              Manage employee hardware, model, accessory &amp; software seat requests
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>New Item Request</DialogTitle>
              <DialogDescription>
                Request an asset, model, accessory, consumable, component, or license.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Item Type</Label>
                  <Select
                    value={itemType}
                    onValueChange={(v) => {
                      setItemType(v as RequestableItemType);
                      setItemId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="req-qty">Quantity</Label>
                  <Input
                    id="req-qty"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Select Item *</Label>
                <Select value={itemId} onValueChange={setItemId} disabled={isLoadingCatalog}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={isLoadingCatalog ? "Loading items..." : "Choose an item..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogItems.map((item) => {
                      const label = item.asset_tag
                        ? `#${item.asset_tag} - ${item.asset_name || "Asset"}`
                        : item.name || item.asset_name || "Unnamed";
                      return (
                        <SelectItem key={item._id} value={item._id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Requester (Optional)</Label>
                <Select value={requesterId} onValueChange={setRequesterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Current signed-in user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Current Signed-In User</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "User"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="req-notes">Justification / Notes</Label>
                <textarea
                  id="req-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Business need, onboarding details, delivery location..."
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(["pending", "fulfilled", "canceled", "all"] as const).map((tab) => (
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
              placeholder="Search item, requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <ExportButton
            filename="checkout-requests"
            sheetName="Requests"
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
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row._id}>
                  <TableCell className="text-xs font-medium">
                    {row.item_type === "Asset" ? (
                      <Link
                        href={`/assets/view/${row.item_id}`}
                        className="hover:underline text-foreground"
                      >
                        {row.item_tag ? `#${row.item_tag} - ` : ""}
                        {row.item_name}
                      </Link>
                    ) : (
                      <span>
                        {row.item_tag ? `#${row.item_tag} - ` : ""}
                        {row.item_name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline">{row.item_type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.requester?._id ? (
                      <Link href={`/people/${row.requester._id}`} className="hover:underline">
                        {row.requester.name || row.requester_name}
                      </Link>
                    ) : (
                      row.requester_name
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{row.quantity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      variant={
                        row.status === "pending"
                          ? "default"
                          : row.status === "fulfilled"
                          ? "secondary"
                          : "outline"
                      }
                      className="capitalize"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                    {row.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === "pending" ? (
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row._id}
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleAction(row._id, "fulfill")}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Fulfill
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row._id}
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleAction(row._id, "cancel")}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground capitalize">
                        {row.status}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

