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
import { ChevronDown, Loader2, Trash } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UrlSearchSync } from "@/components/UrlSearchSync";
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
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ExportButton } from "@/components/ExportButton";
import { BulkActionBar } from "@/components/BulkActionBar";
import { executeBulkAction } from "@/lib/bulkClient";
import { getClientErrorMessage } from "@/lib/errorMessages";
import { usePermissions } from "@/hooks/usePermissions";
import type { ExportColumnDef } from "@/lib/exportData";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import ComponentEditForm from "../forms/Components/ComponentEditForm";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";

export type Component = {
  _id: string;
  name: string;
  serial_number?: string;
  category?: {
    name: string;
  };
  company?: {
    name: string;
  };
  manufacturer?: {
    name: string;
  };
  supplier?: {
    name: string;
  };
  location?: {
    name: string;
  };
  qty: number;
  min_amt?: number;
  purchase_cost?: number;
  purchase_date?: string;
  order_number?: string;
  image?: string;
};

export function ComponentsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions } = usePermissions();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const handleUrlSearch = React.useCallback((q: string) => {
    setColumnFilters(q ? [{ id: "name", value: q }] : []);
  }, []);

  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["components"],
    queryFn: async () => {
      const response = await axios.get("/api/core/components");
      return response.data.data;
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/core/components?id=${id}`);
      toast({
        title: response.data.message || "Component Deleted",
        description: "Component deleted successfully",
        variant: "destructive",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["counttotals"] });
    } catch (error) {
      console.error("Error deleting component:", error);
      toast({
        title: "Error",
        description: "Failed to delete component",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Component>[] = [
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
          src={row.original.image}
          alt={row.original.name}
          fallback="component"
          size="sm"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Component Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "serial_number",
      header: "Serial #",
      cell: ({ row }) => (
        <div className="uppercase">{row.getValue("serial_number") || "N/A"}</div>
      ),
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => <div>{row.original.category?.name || "N/A"}</div>,
    },
    {
      accessorKey: "qty",
      header: "Quantity",
      cell: ({ row }) => {
        const qty = row.original.qty ?? 0;
        const minAmt = row.original.min_amt ?? 0;
        const isLow = minAmt > 0 && qty <= minAmt;

        return (
          <div className="flex items-center gap-2">
            <span>{qty}</span>
            {isLow && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Low Stock
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "min_amt",
      header: "Min Qty",
      cell: ({ row }) => <div>{row.getValue("min_amt") ?? 0}</div>,
    },
    {
      accessorKey: "location.name",
      header: "Location",
      cell: ({ row }) => <div>{row.original.location?.name || "N/A"}</div>,
    },
    {
      accessorKey: "manufacturer.name",
      header: "Manufacturer",
      cell: ({ row }) => <div>{row.original.manufacturer?.name || "N/A"}</div>,
    },
    {
      accessorKey: "supplier.name",
      header: "Supplier",
      cell: ({ row }) => <div>{row.original.supplier?.name || "N/A"}</div>,
    },
    {
      accessorKey: "purchase_cost",
      header: "Cost",
      cell: ({ row }) => <div>${row.getValue("purchase_cost") ?? 0}</div>,
    },
    {
      accessorKey: "purchase_date",
      header: "Date",
      cell: ({ row }) => {
        const dateStr = row.getValue("purchase_date");
        if (!dateStr || typeof dateStr !== "string") return "N/A";
        try {
          const date = new Date(dateStr);
          return isNaN(date.getTime())
            ? "N/A"
            : new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              }).format(date);
        } catch {
          return "N/A";
        }
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const id = row.original._id;

        return (
          <div className="flex gap-2">
            <ComponentEditForm id={id} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="border text-red-500 hover:text-red-700"
                >
                  <Trash size={18} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this hardware component.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => handleDelete(id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const pageSizeOptions = [5, 10, 20, 50];

  const componentExportColumns: ExportColumnDef<Component>[] = React.useMemo(
    () => [
      { id: "name", header: "Component Name", accessor: (c) => c.name || "-" },
      { id: "serial_number", header: "Serial #", accessor: (c) => c.serial_number || "-" },
      { id: "category.name", header: "Category", accessor: (c) => c.category?.name || "-" },
      { id: "qty", header: "Quantity", accessor: (c) => c.qty ?? 0 },
      { id: "min_amt", header: "Min Qty", accessor: (c) => c.min_amt ?? 0 },
      { header: "Company", accessor: (c) => c.company?.name || "-" },
      { id: "location.name", header: "Location", accessor: (c) => c.location?.name || "-" },
      { id: "manufacturer.name", header: "Manufacturer", accessor: (c) => c.manufacturer?.name || "-" },
      { id: "supplier.name", header: "Supplier", accessor: (c) => c.supplier?.name || "-" },
      { id: "purchase_cost", header: "Cost ($)", accessor: (c) => Number(c.purchase_cost) || 0 },
      {
        id: "purchase_date",
        header: "Purchase Date",
        accessor: (c) => (c.purchase_date ? c.purchase_date.slice(0, 10) : "-"),
      },
      { header: "Order Number", accessor: (c) => c.order_number || "-" },
    ],
    []
  );

  return (
    <div className="w-full">
      <UrlSearchSync onSearch={handleUrlSearch} />
      <div className="flex flex-wrap items-center py-4 gap-2">
        <Input
          placeholder="Filter by component name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 ml-auto">
          <ExportButton
            filename="components_inventory"
            sheetName="Components"
            data={table.getFilteredRowModel().rows.map((r) => r.original)}
            allData={data}
            selectedData={table.getFilteredSelectedRowModel().rows.map((r) => r.original)}
            columns={componentExportColumns}
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
        const selected = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
        return (
          <BulkActionBar
            selectedCount={selected.length}
            entityLabel="component"
            onClearSelection={() => setRowSelection({})}
            exportConfig={{
              filename: "components_selected",
              sheetName: "Selected Components",
              data: selected,
              columns: componentExportColumns,
            }}
            actions={
              permissions.canDeleteAssets
                ? [
                    {
                      id: "bulk-delete-components",
                      label: "Delete Selected",
                      icon: <Trash size={14} />,
                      variant: "destructive",
                      confirmTitle: `Delete ${selected.length} selected component(s)?`,
                      onExecute: async () => {
                        try {
                          const res = await executeBulkAction({
                            entity: "component",
                            action: "delete",
                            ids: selected.map((s) => s._id),
                          });
                          toast({ title: "Bulk Delete Complete", description: res.message });
                          setRowSelection({});
                          await Promise.all([
                            refetch(),
                            queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
                          ]);
                        } catch (err) {
                          toast({
                            title: "Bulk Delete Failed",
                            description: getClientErrorMessage(err, "Unable to delete components."),
                            variant: "destructive",
                          });
                        }
                      },
                    },
                  ]
                : []
            }
          />
        );
      })()}

      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-8">
          Error while fetching components
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
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
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
                    No components found. Click &quot;Add Component&quot; above to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
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

export default ComponentsTable;

