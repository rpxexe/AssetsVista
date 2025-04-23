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
import axios from "axios";
import AssetEditForm from "../forms/Assets/AssetsEditForm";
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

import { useQuery } from "@tanstack/react-query";

export type Asset = {
  _id: string;
  asset_tag: string;
  serial_number: string;
  asset_model: {
    name: string;
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
    name: string;
  };
  asset_name: string;
  warranty: number;
  order_number: string;
  purchase_date: string;
  purchase_cost: number;
  eol_date: string;
};

export function AssetsTable() {
  const { toast } = useToast();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["assets"], // Correct cache key
    queryFn: async () => {
      const response = await axios.get("/api/core/asset");
      return response.data.data;
    },
    refetchInterval: 3000,
  });

  // Define handleDelete inside the component to access refetch
  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/core/asset?id=${id}`);
      toast({
        title: response.data.message,
        description: "Asset Deleted Successfully",
        variant: "destructive",
      });
      refetch(); // Refresh data after deletion
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
      accessorKey: "asset_tag",
      header: "Asset Tag",
      cell: ({ row }) => (
        <div className="uppercase">{row.getValue("asset_tag")}</div>
      ),
    },
    {
      accessorKey: "asset_name",
      header: "Name",
      cell: ({ row }) => <div>{row.getValue("asset_name")}</div>,
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
      header: "Asset Modal",
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
        } catch (error) {
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
        } catch (error) {
          return "Invalid date";
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
            <AssetEditForm id={id} />
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
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove your data from our servers.
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

  const pageSizeOptions = [4, 10, 15, 25, 50];

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter assets..."
          value={
            (table.getColumn("asset_name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("asset_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
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
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500">
          Error while fetching the data
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
                    No results.
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
