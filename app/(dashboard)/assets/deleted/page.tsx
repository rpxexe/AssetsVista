"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
import { Skeleton } from "skullet/react";

import { BulkActionBar } from "@/components/BulkActionBar";
import { ExportButton } from "@/components/ExportButton";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import { SampleTableRows } from "@/components/skeletons/AppSkeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useToast } from "@/hooks/use-toast";
import { executeBulkAction } from "@/lib/bulkClient";
import { getClientErrorMessage } from "@/lib/errorMessages";
import type { ExportColumnDef } from "@/lib/exportData";

export default function DeletedAssetsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bulk = useBulkSelection();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data: deletedAssets = [],
    isLoading,
    isError,
  } = useQuery<any[]>({
    queryKey: ["deleted-assets"],
    queryFn: async () => {
      const res = await axios.get("/api/core/asset?deleted=1");
      return res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deletedAssets;
    return deletedAssets.filter((a) =>
      [a.asset_tag, a.asset_name, a.serial_number, a.asset_model?.name, a.deletedBy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [deletedAssets, search]);

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["deleted-assets"] }),
      queryClient.invalidateQueries({ queryKey: ["assets"] }),
      queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
      queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
      queryClient.invalidateQueries({ queryKey: ["status"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
    ]);
  };

  const handleRestoreOne = async (id: string, tag: string) => {
    setBusyId(id);
    try {
      await axios.patch("/api/core/asset", { id, action: "restore" });
      toast({
        title: "Asset Restored",
        description: `#${tag} was restored back into active inventory.`,
      });
      await invalidateAll();
    } catch (err) {
      toast({
        title: "Restore Failed",
        description: getClientErrorMessage(err, "Unable to restore deleted asset."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handlePurgeOne = async (id: string, tag: string) => {
    setBusyId(id);
    try {
      await axios.delete(`/api/core/asset?id=${id}&permanent=true`);
      toast({
        title: "Permanently Deleted",
        description: `#${tag} has been permanently removed from the database.`,
        variant: "destructive",
      });
      await invalidateAll();
    } catch (err) {
      toast({
        title: "Purge Failed",
        description: getClientErrorMessage(err, "Unable to permanently delete asset."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const selectedRows = useMemo(
    () => filtered.filter((a) => bulk.isSelected(a._id)),
    [filtered, bulk]
  );

  const exportColumns: ExportColumnDef<any>[] = [
    { header: "Asset Tag", accessor: (a) => a.asset_tag || "-" },
    { header: "Asset Name", accessor: (a) => a.asset_name || "-" },
    { header: "Model", accessor: (a) => a.asset_model?.name || "-" },
    { header: "Serial Number", accessor: (a) => a.serial_number || "-" },
    { header: "Status", accessor: (a) => a.status?.name || "-" },
    { header: "Deleted By", accessor: (a) => a.deletedBy || "-" },
    {
      header: "Deleted At",
      accessor: (a) => (a.deletedAt ? format(new Date(a.deletedAt), "yyyy-MM-dd HH:mm") : "-"),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[1.75em] p-5 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border bg-muted/50 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Deleted Assets</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {deletedAssets.length} in trash
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Restore mistakenly deleted hardware or permanently purge retired records from storage.
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search deleted assets by tag, name, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ExportButton
          filename="deleted_assets"
          sheetName="Deleted Assets"
          data={filtered}
          allData={deletedAssets}
          selectedData={selectedRows}
          columns={exportColumns}
        />
      </div>

      <BulkActionBar
        selectedCount={selectedRows.length}
        entityLabel="deleted asset"
        onClearSelection={bulk.clear}
        exportConfig={{
          filename: "deleted_assets_selected",
          sheetName: "Deleted Assets",
          data: selectedRows,
          columns: exportColumns,
        }}
        actions={[
          {
            id: "restore-selected-assets",
            label: "Restore Selected",
            icon: <RotateCcw className="h-3.5 w-3.5" />,
            onExecute: async () => {
              const res = await executeBulkAction({
                entity: "asset",
                action: "restore",
                ids: selectedRows.map((a) => a._id),
              });
              toast({ title: "Restore Complete", description: res.message });
              bulk.clear();
              await invalidateAll();
            },
          },
          {
            id: "purge-selected-assets",
            label: "Delete Permanently",
            variant: "destructive",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            confirmTitle: `Permanently delete ${selectedRows.length} asset(s)?`,
            confirmDescription:
              "This permanently removes the selected records from MongoDB and cannot be undone.",
            onExecute: async () => {
              const res = await executeBulkAction({
                entity: "asset",
                action: "force_delete",
                ids: selectedRows.map((a) => a._id),
              });
              toast({ title: "Purge Complete", description: res.message, variant: "destructive" });
              bulk.clear();
              await invalidateAll();
            },
          },
        ]}
      />

      <Skeleton
        id="deleted-assets-table"
        loading={isLoading}
        label="Loading deleted assets"
        empty={!isLoading && !isError && filtered.length === 0}
        emptyMessage={
          <div className="rounded-xl border py-14 text-center text-sm text-muted-foreground">
            {deletedAssets.length === 0
              ? "No deleted assets in trash."
              : "No deleted assets match your search filter."}
          </div>
        }
        error={
          !isLoading && isError ? (
            <div className="rounded-xl border py-10 text-center text-sm text-red-500">
              Could not load deleted assets.
            </div>
          ) : undefined
        }
      >
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(filtered.map((a) => a._id))}
                    onCheckedChange={(checked) =>
                      bulk.toggleAll(
                        filtered.map((a) => a._id),
                        !!checked
                      )
                    }
                    aria-label="Select all deleted assets"
                  />
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Deleted By</TableHead>
                <TableHead>Deleted At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SampleTableRows
                  columns={["checkbox", "thumb", "mono", "text", "text", "mono", "text", "date", "actions"]}
                  rowCount={5}
                />
              ) : (
                filtered.map((asset) => {
                  const busy = busyId === asset._id;
                  return (
                    <TableRow key={asset._id}>
                      <TableCell>
                        <Checkbox
                          checked={bulk.isSelected(asset._id)}
                          onCheckedChange={(checked) => bulk.toggleOne(asset._id, !!checked)}
                          aria-label={`Select ${asset.asset_tag}`}
                        />
                      </TableCell>
                      <TableCell>
                        <ImageThumbnail
                          src={asset.image || asset.asset_model?.image}
                          alt={asset.asset_name || asset.asset_tag}
                          fallback="asset"
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="font-mono font-semibold uppercase">
                        #{asset.asset_tag}
                      </TableCell>
                      <TableCell className="font-medium">{asset.asset_name || "—"}</TableCell>
                      <TableCell className="text-xs">{asset.asset_model?.name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{asset.serial_number || "—"}</TableCell>
                      <TableCell className="text-xs">{asset.deletedBy || "Admin"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {asset.deletedAt
                          ? format(new Date(asset.deletedAt), "MMM d, yyyy · HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs"
                            disabled={busy}
                            onClick={() => handleRestoreOne(asset._id, asset.asset_tag)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            Restore
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                disabled={busy}
                                aria-label="Permanently delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Permanently delete #{asset.asset_tag}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently deletes this asset record from the database and cannot be reversed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => handlePurgeOne(asset._id, asset.asset_tag)}
                                >
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </div>
  );
}

