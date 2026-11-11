"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Loader2, RotateCcw, Search, Trash2, UserX } from "lucide-react";
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

export default function DeletedPeoplePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bulk = useBulkSelection();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data: deletedPeople = [],
    isLoading,
    isError,
  } = useQuery<any[]>({
    queryKey: ["deleted-people"],
    queryFn: async () => {
      const res = await axios.get("/api/core/people?deleted=1");
      return res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deletedPeople;
    return deletedPeople.filter((p) =>
      [p.name, p.username, p.email, p.employee_num, p.deletedBy, p.department?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [deletedPeople, search]);

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["deleted-people"] }),
      queryClient.invalidateQueries({ queryKey: ["people"] }),
      queryClient.invalidateQueries({ queryKey: ["people-offboarding"] }),
      queryClient.invalidateQueries({ queryKey: ["people-sidebar-counts"] }),
      queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
      queryClient.invalidateQueries({ queryKey: ["users"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
    ]);
  };

  const handleRestoreOne = async (id: string, name: string) => {
    setBusyId(id);
    try {
      await axios.patch("/api/core/people", { id, action: "restore" });
      toast({
        title: "Person Restored",
        description: `${name} was restored to the People Directory (re-enable login separately if needed).`,
      });
      await invalidateAll();
    } catch (err) {
      toast({
        title: "Restore Failed",
        description: getClientErrorMessage(err, "Unable to restore person record."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handlePurgeOne = async (id: string, name: string) => {
    setBusyId(id);
    try {
      await axios.delete(`/api/core/people?id=${id}&permanent=true`);
      toast({
        title: "Permanently Purged",
        description: `${name} was permanently removed from the database.`,
        variant: "destructive",
      });
      await invalidateAll();
    } catch (err) {
      toast({
        title: "Purge Failed",
        description: getClientErrorMessage(err, "Unable to purge person record."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const exportColumns: ExportColumnDef<any>[] = [
    { header: "Name", accessor: (p) => p.name || "-" },
    { header: "Username", accessor: (p) => p.username || "-" },
    { header: "Email", accessor: (p) => p.email || "-" },
    { header: "Employee #", accessor: (p) => p.employee_num || "-" },
    { header: "Department", accessor: (p) => p.department?.name || "-" },
    {
      header: "Deleted Date",
      accessor: (p) => (p.deletedAt ? format(new Date(p.deletedAt), "yyyy-MM-dd HH:mm") : "-"),
    },
    { header: "Deleted By", accessor: (p) => p.deletedBy || "-" },
  ];

  const selectedPeople = filtered.filter((p) => bulk.isSelected(p._id));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex flex-wrap items-center justify-between gap-3 bg-card">
        <div className="flex items-center space-x-3">
          <UserX className="h-7 w-7 text-destructive shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl sm:text-3xl font-semibold">Deleted Users</h3>
              <Badge variant="outline" className="text-xs">
                {deletedPeople.length} In Trash
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Soft-deleted profiles automatically suspend logins &amp; revoke API keys. Restore or
              permanently purge records below.
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search name, email, username, deleted by..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ExportButton
          filename="deleted_users"
          sheetName="Deleted Users"
          data={filtered}
          allData={deletedPeople}
          selectedData={selectedPeople}
          columns={exportColumns}
        />
      </div>

      <BulkActionBar
        selectedCount={selectedPeople.length}
        entityLabel="deleted person"
        onClearSelection={() => bulk.clear()}
        exportConfig={{
          filename: "deleted_users_selected",
          sheetName: "Deleted Users",
          data: selectedPeople,
          columns: exportColumns,
        }}
        actions={[
          {
            id: "restore-people",
            label: "Restore Selected",
            icon: <RotateCcw className="h-3.5 w-3.5" />,
            variant: "default",
            onExecute: async () => {
              const res = await executeBulkAction({
                entity: "people",
                action: "restore",
                ids: selectedPeople.map((p) => p._id),
              });
              toast({ title: "People Restored", description: res.message });
              bulk.clear();
              await invalidateAll();
            },
          },
          {
            id: "purge-people",
            label: "Permanently Purge",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            variant: "destructive",
            confirmTitle: `Permanently delete ${selectedPeople.length} person record(s)?`,
            confirmDescription:
              "This permanently deletes the selected directory records from the database and cannot be undone.",
            onExecute: async () => {
              const res = await executeBulkAction({
                entity: "people",
                action: "purge",
                ids: selectedPeople.map((p) => p._id),
              });
              toast({
                title: "Permanently Purged",
                description: res.message,
                variant: "destructive",
              });
              bulk.clear();
              await invalidateAll();
            },
          },
        ]}
      />

      <Skeleton loading={isLoading} label="Loading deleted users">
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(filtered.map((p) => p._id))}
                    onCheckedChange={(checked) =>
                      bulk.toggleAll(filtered.map((p) => p._id), Boolean(checked))
                    }
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Username / ID</TableHead>
                <TableHead>Department / Email</TableHead>
                <TableHead>Deleted At</TableHead>
                <TableHead>Deleted By</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SampleTableRows
                  columns={[
                    "checkbox",
                    "avatar",
                    "mono",
                    "subtext",
                    "date",
                    "text",
                    "badge",
                    "actions",
                  ]}
                  rowCount={5}
                />
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-destructive py-10">
                    Failed to load deleted users.
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    Trash is empty — no deleted people records found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const busy = busyId === p._id;
                  const displayName = p.name || p.username || "User";
                  return (
                    <TableRow key={p._id}>
                      <TableCell>
                        <Checkbox
                          checked={bulk.isSelected(p._id)}
                          onCheckedChange={() => bulk.toggleOne(p._id)}
                          aria-label={`Select ${displayName}`}
                        />
                      </TableCell>
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
                            <div className="font-semibold text-sm">{displayName}</div>
                            {p.title && (
                              <div className="text-xs text-muted-foreground">{p.title}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div>{p.username || "-"}</div>
                        {p.employee_num && (
                          <div className="text-muted-foreground">#{p.employee_num}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{p.email || "-"}</div>
                        <div className="text-muted-foreground">{p.department?.name || "-"}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {p.deletedAt ? format(new Date(p.deletedAt), "MMM d, yyyy · HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{p.deletedBy || "-"}</TableCell>
                      <TableCell>
                        {p.user_id ? (
                          <Badge variant="outline" className="text-[11px] text-rose-600 dark:text-rose-400 border-rose-500/30">
                            Login Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            Directory Only
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            disabled={busy}
                            onClick={() => handleRestoreOne(p._id, displayName)}
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
                                size="sm"
                                variant="destructive"
                                className="h-8 gap-1"
                                disabled={busy}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Purge
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Permanently purge {displayName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This deletes the directory record forever and cannot be restored.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => handlePurgeOne(p._id, displayName)}
                                >
                                  Purge Forever
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

