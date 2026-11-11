"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, ClipboardCheck, Loader2, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/BulkActionBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { executeBulkAction } from "@/lib/bulkClient";
import { getClientErrorMessage } from "@/lib/errorMessages";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "skullet/react";
import { SampleTableRows } from "@/components/skeletons/AppSkeletons";

interface AcceptanceRow {
  _id: string;
  checkoutable_type: string;
  checkoutable_id: string;
  item_name: string;
  item_tag?: string;
  assigned_name?: string;
  status: "pending" | "accepted" | "declined";
  signature?: string;
  note?: string;
  accepted_at?: string | null;
  declined_at?: string | null;
  createdAt?: string;
  assigned_to?: {
    _id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
}

export default function AcceptancesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<"pending" | "accepted" | "declined" | "all">(
    "pending"
  );
  const [search, setSearch] = useState("");
  const [activeRow, setActiveRow] = useState<AcceptanceRow | null>(null);
  const bulk = useBulkSelection();
  const [modalAction, setModalAction] = useState<"accept" | "decline">("accept");
  const [signature, setSignature] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rows = [], isLoading } = useQuery<AcceptanceRow[]>({
    queryKey: ["acceptances", statusTab],
    queryFn: async () => {
      const res = await axios.get("/api/core/acceptances", {
        params: { status: statusTab },
      });
      return res.data.data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.item_name.toLowerCase().includes(q) ||
        (r.item_tag || "").toLowerCase().includes(q) ||
        (r.assigned_name || r.assigned_to?.name || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const exportColumns: ExportColumnDef<AcceptanceRow>[] = [
    { header: "Item Type", accessor: (r) => r.checkoutable_type },
    { header: "Asset Tag", accessor: (r) => r.item_tag || "" },
    { header: "Item", accessor: (r) => r.item_name },
    {
      header: "Assigned To",
      accessor: (r) => r.assigned_to?.name || r.assigned_name || "",
    },
    { header: "Status", accessor: (r) => r.status },
    {
      header: "Checked Out",
      accessor: (r) => (r.createdAt ? format(new Date(r.createdAt), "yyyy-MM-dd HH:mm") : ""),
    },
    { header: "Signature", accessor: (r) => r.signature || "" },
    { header: "Note", accessor: (r) => r.note || "" },
  ];

  const openDecisionModal = (row: AcceptanceRow, action: "accept" | "decline") => {
    setActiveRow(row);
    setModalAction(action);
    setSignature(row.assigned_to?.name || row.assigned_name || "");
    setNote("");
  };

  const submitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRow) return;

    setIsSubmitting(true);
    try {
      await axios.patch("/api/core/acceptances", {
        id: activeRow._id,
        action: modalAction,
        signature: signature.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast({
        title:
          modalAction === "accept"
            ? "Checkout acceptance confirmed"
            : "Checkout declined and asset released back to inventory",
      });
      setActiveRow(null);
      queryClient.invalidateQueries({ queryKey: ["acceptances"] });
      queryClient.invalidateQueries({ queryKey: ["needs-attention"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
    } catch {
      toast({
        title: "Error",
        description: "Failed to record acceptance decision",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleAcceptanceIds = filtered.map((r) => r._id);
  const selectedAcceptances = filtered.filter((r) => bulk.isSelected(r._id));

  const runAcceptanceBulk = async (action: "accept" | "decline") => {
    if (selectedAcceptances.length === 0) return;
    try {
      const res = await executeBulkAction({
        entity: "acceptance",
        action,
        ids: selectedAcceptances.map((r) => r._id),
      });
      toast({ title: "Bulk Acceptance Update", description: res.message });
      bulk.clear();
      queryClient.invalidateQueries({ queryKey: ["acceptances"] });
      queryClient.invalidateQueries({ queryKey: ["needs-attention"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
    } catch (err) {
      toast({
        title: "Bulk Action Failed",
        description: getClientErrorMessage(err, "Failed to update selected acceptances."),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex flex-wrap items-center justify-between gap-3 bg-card">
        <div className="flex items-center space-x-3">
          <ClipboardCheck strokeWidth={2.2} size={30} />
          <div>
            <h3 className="text-3xl font-semibold">Checkout Acceptances</h3>
            <p className="text-xs text-muted-foreground">
              Review EULA / custody acknowledgements for checked-out assets and equipment
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(["pending", "accepted", "declined", "all"] as const).map((tab) => (
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
              placeholder="Search item, tag, assignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <ExportButton
            filename="acceptances"
            sheetName="Acceptances"
            data={filtered}
            selectedData={selectedAcceptances}
            allData={rows}
            columns={exportColumns}
            size="sm"
          />
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedAcceptances.length}
        entityLabel="acceptance"
        onClearSelection={bulk.clear}
        exportConfig={{
          filename: "acceptances_selected",
          sheetName: "Acceptances",
          data: selectedAcceptances,
          columns: exportColumns,
        }}
        actions={[
          {
            id: "bulk-accept-checkouts",
            label: "Accept Selected",
            icon: <Check size={14} />,
            confirmTitle: `Accept ${selectedAcceptances.length} selected checkout(s)?`,
            confirmDescription:
              "Eligible pending custody acknowledgements will be marked accepted using your account signature.",
            onExecute: () => runAcceptanceBulk("accept"),
          },
          {
            id: "bulk-decline-checkouts",
            label: "Decline Selected",
            icon: <X size={14} />,
            variant: "destructive",
            confirmTitle: `Decline ${selectedAcceptances.length} selected checkout(s)?`,
            confirmDescription:
              "Eligible pending hardware checkouts will be declined and checked back into available inventory.",
            onExecute: () => runAcceptanceBulk("decline"),
          },
        ]}
      />

      <div className="border rounded-xl bg-card overflow-hidden">
        <Skeleton
          id={`acceptances-table-${statusTab}`}
          loading={isLoading}
          label="Loading checkout acceptances"
          empty={!isLoading && filtered.length === 0}
          emptyMessage={
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={false} disabled aria-label="Select all acceptances" />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Checked Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signature / Note</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    No checkout acceptance records found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(visibleAcceptanceIds)}
                    onCheckedChange={(checked) =>
                      bulk.toggleAll(visibleAcceptanceIds, !!checked)
                    }
                    aria-label="Select all acceptances"
                  />
                </TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Checked Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signature / Note</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SampleTableRows
                  columns={["checkbox", "text", "badge", "text", "date", "badge", "text", "actions"]}
                  rowCount={6}
                />
              ) : (
                filtered.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell>
                      <Checkbox
                        checked={bulk.isSelected(row._id)}
                        onCheckedChange={(checked) => bulk.toggleOne(row._id, !!checked)}
                        aria-label={`Select ${row.item_name}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {row.checkoutable_type === "Asset" ? (
                        <Link
                          href={`/assets/view/${row.checkoutable_id}`}
                          className="hover:underline text-foreground"
                        >
                          {row.item_tag ? `#${row.item_tag} - ` : ""}
                          {row.item_name}
                        </Link>
                      ) : (
                        row.item_name
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{row.checkoutable_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.assigned_to?._id ? (
                        <Link
                          href={`/people/${row.assigned_to._id}`}
                          className="hover:underline text-foreground"
                        >
                          {row.assigned_to.name || row.assigned_name}
                        </Link>
                      ) : (
                        row.assigned_name || "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant={
                          row.status === "pending"
                            ? "default"
                            : row.status === "accepted"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                      {row.signature ? `Signed: ${row.signature}` : row.note || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "pending" ? (
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => openDecisionModal(row, "accept")}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => openDecisionModal(row, "decline")}
                          >
                            <X className="h-3.5 w-3.5" />
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {row.accepted_at
                            ? format(new Date(row.accepted_at), "MMM d")
                            : row.declined_at
                            ? format(new Date(row.declined_at), "MMM d")
                            : "Resolved"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Skeleton>
      </div>

      <Dialog open={Boolean(activeRow)} onOpenChange={(o) => !o && setActiveRow(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {modalAction === "accept" ? "Accept Asset Custody" : "Decline Checkout"}
            </DialogTitle>
            <DialogDescription>
              {activeRow?.item_tag ? `#${activeRow.item_tag} - ` : ""}
              {activeRow?.item_name}
              {modalAction === "decline"
                ? " — Declining automatically checks the asset back in as Ready to Deploy."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDecision} className="space-y-3">
            {modalAction === "accept" && (
              <div className="space-y-1.5">
                <Label htmlFor="acc-sig">Typed Signature / Acknowledgement</Label>
                <Input
                  id="acc-sig"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Full name confirming EULA receipt"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="acc-note">Notes</Label>
              <Textarea
                id="acc-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional condition notes or reason..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActiveRow(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {modalAction === "accept" ? "Confirm Accept" : "Decline & Check In"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

