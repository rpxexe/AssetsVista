"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ClipboardList, LogIn, RefreshCw, Trash } from "lucide-react";
import * as React from "react";
import Link from "next/link";
import { BulkActionBar } from "@/components/BulkActionBar";
import { DataTableSkullet } from "@/components/skeletons/AppSkeletons";
import { executeBulkAction } from "@/lib/bulkClient";
import { getClientErrorMessage } from "@/lib/errorMessages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import AssetEditForm from "../forms/Assets/AssetsEditForm";
import AssetCheckoutDialog from "../forms/Assets/AssetCheckoutDialog";
import AssetCheckinDialog from "../forms/Assets/AssetCheckinDialog";
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
} from "../ui/alert-dialog";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExportButton } from "@/components/ExportButton";
import type { ExportColumnDef } from "@/lib/exportData";
import { ImageThumbnail } from "@/components/ImageThumbnail";

export type Asset = {
  _id: string;
  asset_tag: string;
  serial_number: string;
  asset_model: {
    name: string;
    image?: string;
  };
  company: {
    name: string;
  };
  location: {
    name: string;
  };
  supplier: {
    name: string;
  };
  manufacturer: {
    name: string;
  };
  department: {
    name: string;
  };
  status: {
    _id?: string;
    name: string;
  };
  asset_name: string;
  warranty: number;
  order_number: string;
  purchase_date: string;
  purchase_cost: number;
  eol_date: string;
  image?: string;
  assigned_to?: any;
  assigned_type?: string;
  checkout_date?: string;
  expected_checkin_date?: string;
};

export function AssetsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions } = usePermissions();
  const searchParams = useSearchParams();
  const statusParam = searchParams ? searchParams.get("status") : null;
  const filterParam = searchParams ? searchParams.get("filter") : null;
  const pastEolParam = searchParams ? searchParams.get("past_eol") : null;
  const urlSearchParam = searchParams ? searchParams.get("search") : null;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [globalFilter, setGlobalFilter] = React.useState<string>(urlSearchParam || "");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [bulkStatusId, setBulkStatusId] = React.useState("");
  const [bulkBusy, setBulkBusy] = React.useState(false);

  const { data: statusOptions = [] } = useQuery<Array<{ _id: string; name: string }>>({
    queryKey: ["status-list-minimal"],
    queryFn: async () => {
      const res = await axios.get("/api/settings/status");
      return res.data.data || [];
    },
    enabled: permissions.canCreateEditAssets,
  });

  const handleBulkAssetAction = async (
    action: "delete" | "checkin" | "status" | "request",
    ids: string[],
    payload?: Record<string, unknown>
  ) => {
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await executeBulkAction({ entity: "asset", action, ids, payload });
      toast({ title: "Bulk Action Complete", description: res.message });
      setRowSelection({});
      setBulkStatusId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assets"] }),
        queryClient.invalidateQueries({ queryKey: ["deleted-assets"] }),
        queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
        queryClient.invalidateQueries({ queryKey: ["status"] }),
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
      ]);
    } catch (err) {
      toast({
        title: "Bulk Action Failed",
        description: getClientErrorMessage(err, "Unable to process selected assets."),
        variant: "destructive",
      });
    } finally {
      setBulkBusy(false);
    }
  };

  React.useEffect(() => {
    if (urlSearchParam !== null) {
      setGlobalFilter(urlSearchParam);
    }
  }, [urlSearchParam]);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assets", statusParam, filterParam, pastEolParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusParam) params.set("status", statusParam);
      if (filterParam) params.set("filter", filterParam);
      if (pastEolParam) params.set("past_eol", pastEolParam);
      const qs = params.toString();
      const url = qs ? `/api/core/asset?${qs}` : "/api/core/asset";
      const response = await axios.get(url);
      return response.data.data;
    },
    placeholderData: keepPreviousData,
  });

  // Invalidate related cached queries on deletion
  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/core/asset?id=${id}`);
      toast({
        title: response.data.message,
        description: "Asset Deleted Successfully",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-assets"] });
      queryClient.invalidateQueries({ queryKey: ["counttotals"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] });
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    }
  };

  // Define columns inside component to access handleDelete
  const columns: ColumnDef<Asset>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => (
        <ImageThumbnail
          src={row.original.image || row.original.asset_model?.image}
          alt={row.original.asset_name || row.original.asset_tag}
          fallback="asset"
          size="md"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "asset_tag",
      header: "Asset Tag",
      cell: ({ row }) => (
        <Link
          href={`/assets/view/${row.original._id}`}
          className="uppercase font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {row.getValue("asset_tag")}
        </Link>
      ),
    },
    {
      accessorKey: "asset_name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/assets/view/${row.original._id}`}
          className="font-medium hover:underline text-foreground"
        >
          {row.getValue("asset_name")}
        </Link>
      ),
    },
    {
      accessorKey: "serial_number",
      header: "Serial No",
      cell: ({ row }) => (
        <div className="uppercase">{row.getValue("serial_number")}</div>
      ),
    },
    {
      accessorKey: "asset_model.name",
      header: "Asset Model",
      cell: ({ row }) => <div>{row.original.asset_model?.name}</div>,
    },
    {
      accessorKey: "warranty",
      header: "Warranty",
      cell: ({ row }) => <div>{row.getValue("warranty")}</div>,
    },
    {
      accessorKey: "status.name",
      header: "Status",
      cell: ({ row }) => <div>{row.original.status?.name}</div>,
    },
    {
      accessorKey: "assigned_to",
      header: "Assigned To",
      cell: ({ row }) => {
        const assigned = row.original.assigned_to;
        const assignedType = row.original.assigned_type;
        if (!assigned) {
          return (
            <Badge variant="outline" className="text-muted-foreground border-dashed">
              Available
            </Badge>
          );
        }
        let displayName = "";
        if (assigned.first_name) {
          displayName = `${assigned.first_name} ${assigned.last_name || ""}`.trim();
        } else if (assigned.name) {
          displayName = assigned.name;
        } else if (assigned.username) {
          displayName = assigned.username;
        } else {
          displayName = "Assigned";
        }

        const badge = (
          <Badge
            variant="secondary"
            className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 hover:opacity-90"
          >
            {displayName} ({assignedType || "Person"})
          </Badge>
        );

        if (assignedType === "People" && assigned._id) {
          return <Link href={`/people/${assigned._id}`}>{badge}</Link>;
        }
        return badge;
      },
    },
    {
      accessorKey: "company.name",
      header: "Company",
      cell: ({ row }) => <div>{row.original.company?.name}</div>,
    },
    {
      accessorKey: "department.name",
      header: "Department",
      cell: ({ row }) => <div>{row.original.department?.name}</div>,
    },
    {
      accessorKey: "purchase_cost",
      header: "Cost",
      cell: ({ row }) => <div>{row.getValue("purchase_cost")}</div>,
    },
    {
      accessorKey: "purchase_date",
      header: "Date",
      cell: ({ row }) => {
        const purchaseDate = row.getValue("purchase_date");
        if (!purchaseDate || typeof purchaseDate !== "string") return "N/A";

        try {
          // Validate the date string before processing
          if (purchaseDate.trim() === "") return "N/A";

          const date = new Date(purchaseDate);

          // Check if the date is valid
          if (isNaN(date.getTime())) return "Invalid date";

          return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          }).format(date);
        } catch {
          return "Invalid date";
        }
      },
    },
    {
      accessorKey: "eol_date",
      header: "EOL Date",
      cell: ({ row }) => {
        const eolDate = row.getValue("eol_date");
        if (!eolDate || typeof eolDate !== "string") return "N/A";

        try {
          // Validate the date string before processing
          if (eolDate.trim() === "") return "N/A";

          const date = new Date(eolDate);

          // Check if the date is valid
          if (isNaN(date.getTime())) return "Invalid date";

          return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          }).format(date);
        } catch {
          return "Invalid date";
        }
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const id = row.original._id;
        const isAssigned = Boolean(row.original.assigned_to);
        const assigned = row.original.assigned_to;
        const assignedName = assigned
          ? (assigned.first_name
              ? `${assigned.first_name} ${assigned.last_name || ""}`.trim()
              : assigned.name || "")
          : undefined;

        if (!permissions.canCheckoutCheckin && !permissions.canCreateEditAssets) {
          return (
            <Link href={`/requests?create=1&itemType=Asset&itemId=${id}`}>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <ClipboardList className="h-3.5 w-3.5" />
                Request Item
              </Button>
            </Link>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {permissions.canCheckoutCheckin &&
              (isAssigned ? (
                <AssetCheckinDialog
                  assetId={id}
                  assetTag={row.original.asset_tag}
                  assetName={row.original.asset_name}
                  assignedToName={assignedName}
                />
              ) : (
                <AssetCheckoutDialog
                  assetId={id}
                  assetTag={row.original.asset_tag}
                  assetName={row.original.asset_name}
                />
              ))}
            {permissions.canCreateEditAssets && <AssetEditForm id={id} />}
            {permissions.canDeleteAssets && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="border text-red-500 hover:text-red-700"
                  >
                    <Trash size={20} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Move asset to Deleted Trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will unassign the asset and move it to Assets &gt; Deleted, where you can restore or permanently purge it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-500 dark:text-white"
                      onClick={() => handleDelete(id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue || "").toLowerCase().trim();
      if (!q) return true;
      const a = row.original;
      const hay = [
        a.asset_tag,
        a.asset_name,
        a.serial_number,
        a.order_number,
        a.status?.name,
        a.company?.name,
        a.location?.name,
        a.department?.name,
        a.asset_model?.name,
        a.manufacturer?.name,
        a.supplier?.name,
        a.assigned_to?.name,
        a.assigned_to?.first_name,
        a.assigned_to?.last_name,
        a.assigned_to?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
  });

  const pageSizeOptions = [4, 10, 15, 25, 50];

  const assetExportColumns: ExportColumnDef<Asset>[] = React.useMemo(
    () => [
      { id: "asset_tag", header: "Asset Tag", accessor: (a) => a.asset_tag || "-" },
      { id: "asset_name", header: "Asset Name", accessor: (a) => a.asset_name || "-" },
      { id: "serial_number", header: "Serial No", accessor: (a) => a.serial_number || "-" },
      { id: "asset_model.name", header: "Asset Model", accessor: (a) => a.asset_model?.name || "-" },
      { id: "status.name", header: "Status", accessor: (a) => a.status?.name || "-" },
      {
        id: "assigned_to",
        header: "Assigned To",
        accessor: (a) => {
          const assigned = a.assigned_to;
          if (!assigned) return "Available";
          if (assigned.first_name) {
            return `${assigned.first_name} ${assigned.last_name || ""}`.trim();
          }
          return assigned.name || assigned.username || "Assigned";
        },
      },
      { header: "Assigned Type", accessor: (a) => a.assigned_type || "-" },
      { id: "company.name", header: "Company", accessor: (a) => a.company?.name || "-" },
      { id: "department.name", header: "Department", accessor: (a) => a.department?.name || "-" },
      { header: "Location", accessor: (a) => a.location?.name || "-" },
      { header: "Manufacturer", accessor: (a) => a.manufacturer?.name || "-" },
      { header: "Supplier", accessor: (a) => a.supplier?.name || "-" },
      { header: "Order Number", accessor: (a) => a.order_number || "-" },
      { id: "purchase_cost", header: "Cost ($)", accessor: (a) => Number(a.purchase_cost) || 0 },
      {
        id: "purchase_date",
        header: "Purchase Date",
        accessor: (a) => (a.purchase_date ? a.purchase_date.slice(0, 10) : "-"),
      },
      { id: "warranty", header: "Warranty (Months)", accessor: (a) => a.warranty ?? 0 },
      { id: "eol_date", header: "EOL Date", accessor: (a) => (a.eol_date ? a.eol_date.slice(0, 10) : "-") },
    ],
    []
  );

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center py-4 gap-2">
        <Input
          placeholder="Search assets by tag, name, serial, assignee..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        {globalFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGlobalFilter("")}
            className="text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}
        {(statusParam || filterParam || pastEolParam) && (
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
            <span className="font-medium text-foreground">
              {statusParam
                ? `Status: ${statusParam}`
                : filterParam === "overdue_audit"
                ? "Overdue Audits"
                : filterParam === "due_audit"
                ? "Audits Due"
                : filterParam === "due_checkin"
                ? "Checkins Due"
                : pastEolParam
                ? "Past EOL"
                : filterParam}
            </span>
            <Link
              href="/assets/listall"
              className="text-muted-foreground hover:text-foreground underline ml-1"
            >
              Reset
            </Link>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <ExportButton
            filename="assets_inventory"
            sheetName="Assets"
            data={table.getFilteredRowModel().rows.map((r) => r.original)}
            allData={data}
            selectedData={table.getFilteredSelectedRowModel().rows.map((r) => r.original)}
            columns={assetExportColumns}
            columnVisibility={columnVisibility}
          />
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

      {(() => {
        const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
        const selectedIds = selectedRows.map((r) => r._id);
        return (
          <BulkActionBar
            selectedCount={selectedRows.length}
            entityLabel="asset"
            onClearSelection={() => setRowSelection({})}
            exportConfig={{
              filename: "assets_selected",
              sheetName: "Selected Assets",
              data: selectedRows,
              columns: assetExportColumns,
            }}
            extraContent={
              permissions.canCreateEditAssets ? (
                <div className="flex items-center gap-1.5">
                  <Select value={bulkStatusId} onValueChange={setBulkStatusId}>
                    <SelectTrigger className="h-8 w-[155px] text-xs bg-background">
                      <SelectValue placeholder="Set status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((st) => (
                        <SelectItem key={st._id} value={st._id} className="text-xs">
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!bulkStatusId || bulkBusy}
                    onClick={() =>
                      void handleBulkAssetAction("status", selectedIds, { statusId: bulkStatusId })
                    }
                    className="h-8 text-xs gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Apply
                  </Button>
                </div>
              ) : null
            }
            actions={[
              ...(!permissions.canCreateEditAssets && permissions.canRequestItems
                ? [
                    {
                      id: "bulk-request",
                      label: "Request Selected",
                      icon: <ClipboardList className="h-3.5 w-3.5" />,
                      variant: "default" as const,
                      disabled: bulkBusy,
                      onExecute: () => handleBulkAssetAction("request", selectedIds),
                    },
                  ]
                : []),
              ...(permissions.canCheckoutCheckin
                ? [
                    {
                      id: "bulk-checkin",
                      label: "Checkin Assigned",
                      icon: <LogIn className="h-3.5 w-3.5" />,
                      variant: "outline" as const,
                      disabled: bulkBusy,
                      confirmTitle: "Check in selected assigned assets?",
                      onExecute: () => handleBulkAssetAction("checkin", selectedIds),
                    },
                  ]
                : []),
              ...(permissions.canDeleteAssets
                ? [
                    {
                      id: "bulk-delete",
                      label: "Delete Selected",
                      icon: <Trash className="h-3.5 w-3.5" />,
                      variant: "destructive" as const,
                      disabled: bulkBusy,
                      confirmTitle: `Delete ${selectedRows.length} selected asset(s)?`,
                      confirmDescription: "This action permanently deletes the selected assets.",
                      onExecute: () => handleBulkAssetAction("delete", selectedIds),
                    },
                  ]
                : []),
            ]}
          />
        );
      })()}

      <DataTableSkullet
        id="assets-table"
        isLoading={isLoading}
        isError={Boolean(error)}
        errorMessage="Error while fetching the data"
        label="Loading assets"
        table={table}
        colSpan={columns.length}
        emptyText="No results."
      />
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
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
