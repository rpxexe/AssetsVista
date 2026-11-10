"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, History, Loader2, RefreshCw } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { ExportButton } from "@/components/ExportButton";
import type { ExportColumnDef, ExportSheet } from "@/lib/exportData";

export type ActionLog = {
  _id: string;
  action_type: "checkout" | "checkin" | "create" | "update" | "delete" | "audit";
  item_type: string;
  item_id: string;
  item_name?: string;
  target_type?: string;
  target_id?: any;
  user?: {
    name?: string;
    username?: string;
    email?: string;
  };
  note?: string;
  created_at: string;
};

export function ActivityLogTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [selectedAction, setSelectedAction] = React.useState<string>("all");

  const {
    data = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["actionlogs"],
    queryFn: async () => {
      const response = await axios.get("/api/core/actionlog?limit=200");
      return response.data.data;
    },
  });

  const filteredData = React.useMemo(() => {
    if (selectedAction === "all") return data;
    return data.filter(
      (log: ActionLog) => log.action_type?.toLowerCase() === selectedAction.toLowerCase()
    );
  }, [data, selectedAction]);

  const activityExportColumns: ExportColumnDef<ActionLog>[] = React.useMemo(
    () => [
      {
        id: "created_at",
        header: "Date & Time",
        accessor: (log) => (log.created_at ? new Date(log.created_at).toLocaleString() : ""),
      },
      { id: "action_type", header: "Action", accessor: (log) => log.action_type },
      { id: "item_type", header: "Item Type", accessor: (log) => log.item_type },
      {
        id: "item_name",
        header: "Item Name / Identifier",
        accessor: (log) => log.item_name || log.item_id,
      },
      {
        id: "target_id",
        header: "Target / Assigned To",
        accessor: (log) =>
          log.target_id?.name ||
          [log.target_id?.first_name, log.target_id?.last_name].filter(Boolean).join(" ") ||
          log.target_type ||
          "-",
      },
      {
        id: "user",
        header: "Actor / Admin",
        accessor: (log) => log.user?.name || log.user?.username || log.user?.email || "System",
      },
      { id: "note", header: "Notes", accessor: (log) => log.note || "" },
    ],
    []
  );

  const activitySummarySheet: ExportSheet = React.useMemo(() => {
    const counts = new Map<string, number>();
    filteredData.forEach((l: ActionLog) => {
      const key = (l.action_type || "unknown").toUpperCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return {
      name: "Action Breakdown",
      headers: ["Action Type", "Event Count"],
      rows: [
        ...Array.from(counts.entries()).map(([k, v]) => [k, v]),
        ["Total Visible Logs", filteredData.length],
        ["Total Fetched Logs", data.length],
      ],
    };
  }, [filteredData, data.length]);

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "checkout":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
            Check Out
          </Badge>
        );
      case "checkin":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white">
            Check In
          </Badge>
        );
      case "create":
        return (
          <Badge variant="outline" className="border-green-600 text-green-700 dark:text-green-400">
            Created
          </Badge>
        );
      case "update":
        return (
          <Badge variant="outline" className="border-amber-600 text-amber-700 dark:text-amber-400">
            Updated
          </Badge>
        );
      case "delete":
        return (
          <Badge variant="destructive">
            Deleted
          </Badge>
        );
      case "audit":
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
            Audited
          </Badge>
        );
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const columns: ColumnDef<ActionLog>[] = [
    {
      accessorKey: "created_at",
      header: "Date & Time",
      cell: ({ row }) => {
        const dateStr = row.getValue("created_at");
        if (!dateStr || typeof dateStr !== "string") return "N/A";
        try {
          const date = new Date(dateStr);
          return isNaN(date.getTime())
            ? "N/A"
            : new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }).format(date);
        } catch {
          return "N/A";
        }
      },
    },
    {
      accessorKey: "action_type",
      header: "Action",
      cell: ({ row }) => getActionBadge(row.getValue("action_type")),
    },
    {
      accessorKey: "item_type",
      header: "Item Type",
      cell: ({ row }) => (
        <span className="font-medium text-xs px-2 py-1 rounded bg-muted">
          {row.getValue("item_type")}
        </span>
      ),
    },
    {
      accessorKey: "item_name",
      header: "Item Name / Identifier",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("item_name") || row.original.item_id}</div>
      ),
    },
    {
      accessorKey: "target_id",
      header: "Target / Assigned To",
      cell: ({ row }) => {
        const target = row.original.target_id;
        const targetType = row.original.target_type;
        if (!target) return <span className="text-muted-foreground">-</span>;

        let label = "";
        if (target.first_name) {
          label = `${target.first_name} ${target.last_name || ""}`.trim();
        } else if (target.name) {
          label = target.name;
        } else if (typeof target === "string") {
          label = target;
        } else {
          label = targetType || "Target";
        }

        return (
          <div className="text-sm">
            {label}
            {targetType && (
              <span className="text-xs text-muted-foreground ml-1">
                ({targetType})
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "user",
      header: "Actor / Admin",
      cell: ({ row }) => {
        const user = row.original.user;
        if (!user) return <span className="text-muted-foreground">System</span>;
        return (
          <div className="text-xs">
            {user.name || user.username || user.email || "Admin"}
          </div>
        );
      },
    },
    {
      accessorKey: "note",
      header: "Notes",
      cell: ({ row }) => (
        <div className="text-xs max-w-xs truncate text-muted-foreground">
          {row.getValue("note") || "-"}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const pageSizeOptions = [10, 20, 50, 100];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between py-4 gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filter by item name..."
            value={(table.getColumn("item_name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("item_name")?.setFilterValue(event.target.value)
            }
            className="max-w-xs"
          />

          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="checkout">Check Out</SelectItem>
              <SelectItem value="checkin">Check In</SelectItem>
              <SelectItem value="create">Created</SelectItem>
              <SelectItem value="update">Updated</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
              <SelectItem value="audit">Audited</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            filename="activity_audit_log"
            sheetName="Activity Logs"
            data={table.getFilteredRowModel().rows.map((r) => r.original)}
            allData={data}
            columns={activityExportColumns}
            columnVisibility={columnVisibility}
            summarySheet={activitySummarySheet}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-8">
          Error while loading activity logs
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-max w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No activity logs recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {filteredData.length} logs
        </div>
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            Rows per page
          </p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-7 rounded-md px-3 text-xs">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ActivityLogTable;
