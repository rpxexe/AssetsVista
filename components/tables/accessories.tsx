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
import type { ExportColumnDef } from "@/lib/exportData";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import AccessoryEditForm from "../forms/Accessories/AccessoryEditForm";
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

export type Accessory = {
  _id: string;
  name: string;
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

export function AccessoriesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    queryKey: ["accessories"],
    queryFn: async () => {
      const response = await axios.get("/api/core/accessories");
      return response.data.data;
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/core/accessories?id=${id}`);
      toast({
        title: response.data.message || "Accessory Deleted",
        description: "Accessory deleted successfully",
        variant: "destructive",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["counttotals"] });
    } catch (error) {
      console.error("Error deleting accessory:", error);
      toast({
        title: "Error",
        description: "Failed to delete accessory",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Accessory>[] = [
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
          fallback="accessory"
          size="sm"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Accessory Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
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
      accessorKey: "company.name",
      header: "Company",
      cell: ({ row }) => <div>{row.original.company?.name || "N/A"}</div>,
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
            <AccessoryEditForm id={id} />
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
                    This will permanently delete this accessory item.
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

  const accessoryExportColumns: ExportColumnDef<Accessory>[] = React.useMemo(
    () => [
      { id: "name", header: "Accessory Name", accessor: (a) => a.name || "-" },
      { id: "category.name", header: "Category", accessor: (a) => a.category?.name || "-" },
      { id: "qty", header: "Quantity", accessor: (a) => a.qty ?? 0 },
      { id: "min_amt", header: "Min Qty", accessor: (a) => a.min_amt ?? 0 },
      { id: "company.name", header: "Company", accessor: (a) => a.company?.name || "-" },
      { id: "location.name", header: "Location", accessor: (a) => a.location?.name || "-" },
      { id: "manufacturer.name", header: "Manufacturer", accessor: (a) => a.manufacturer?.name || "-" },
      { header: "Supplier", accessor: (a) => a.supplier?.name || "-" },
      { id: "purchase_cost", header: "Cost ($)", accessor: (a) => Number(a.purchase_cost) || 0 },
      {
        id: "purchase_date",
        header: "Purchase Date",
        accessor: (a) => (a.purchase_date ? a.purchase_date.slice(0, 10) : "-"),
      },
      { header: "Order Number", accessor: (a) => a.order_number || "-" },
    ],
    []
  );

  return (
    <div className="w-full">
      <UrlSearchSync onSearch={handleUrlSearch} />
      <div className="flex flex-wrap items-center py-4 gap-2">
        <Input
          placeholder="Filter by accessory name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 ml-auto">
          <ExportButton
            filename="accessories_inventory"
            sheetName="Accessories"
            data={table.getFilteredRowModel().rows.map((r) => r.original)}
            allData={data}
            selectedData={table.getFilteredSelectedRowModel().rows.map((r) => r.original)}
            columns={accessoryExportColumns}
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
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-8">
          Error while fetching accessories
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
                    No accessories found. Click &quot;Add Accessory&quot; above to create one.
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

export default AccessoriesTable;

