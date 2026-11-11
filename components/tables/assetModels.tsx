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
import { ChevronDown, Trash } from "lucide-react";
import * as React from "react";
import { DataTableSkullet } from "@/components/skeletons/AppSkeletons";

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
import AssetModelEditForm from "../forms/settings/assetmodel/AssetModelEditForm";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import { TaxonomyBulkBar } from "@/components/tables/TaxonomyBulkBar";
import type { ExportColumnDef } from "@/lib/exportData";


export type AssetModel = {
  _id: string;
  name: string;
  model_no: string;
  assets:number;
  image?: string;
  category: {
    name:string;
  }
};

const assetModelExportColumns: ExportColumnDef<AssetModel>[] = [
  { header: "Model Name", accessor: (r) => r.name },
  { header: "Model No.", accessor: (r) => r.model_no },
  { header: "Category", accessor: (r) => r.category?.name ?? "" },
  { header: "Assets", accessor: (r) => r.assets ?? 0 },
];

export function AssetModelTable() {
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
    queryKey: ["assetsModels"], // Correct cache key
    queryFn: async () => {
      const response = await axios.get("/api/settings/assetmodel");
      return response.data.data;
    },
  });

  // Define handleDelete inside the component to access refetch
  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/settings/assetmodel?id=${id}`);
      toast({
        title: response.data.message,
        description: "Asset Model Deleted Successfully",
        variant: "destructive",
      });
      refetch(); // Refresh data after deletion
    } catch (error) {
      console.error("Error deleting Asset Model:", error);
      toast({
        title: "Error",
        description: "Failed to delete Asset Model",
        variant: "destructive",
      });
    }
  };

  // Define columns inside component to access handleDelete
  const columns: ColumnDef<AssetModel>[] = [
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
          fallback="model"
          size="sm"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Model Name",
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "model_no",
      header: "Model Number",
      cell: ({ row }) => <div>{row.getValue("model_no")}</div>,
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => <div>{row.original.category?.name}</div>,
    },
    {
      accessorKey: "assets",
      header: "Assets",
      cell: ({ row }) => <div>{row.getValue("assets")}</div>,
    },

    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const id = row.original._id;

        return (
          <div className="flex gap-2 justify-center">
            <AssetModelEditForm id={id} />
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
          placeholder="Filter Asset Model..."
          value={
            (table.getColumn("name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
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
      <TaxonomyBulkBar
        entity="assetmodel"
        entityLabel="asset model"
        filename="asset_models_selected"
        sheetName="Asset Models"
        selectedRows={table.getFilteredSelectedRowModel().rows.map((r) => r.original as AssetModel)}
        columns={assetModelExportColumns}
        onClearSelection={() => setRowSelection({})}
        onSuccess={refetch}
      />
      <DataTableSkullet
        id="asset-models-table"
        isLoading={isLoading}
        isError={Boolean(error)}
        errorMessage="Error while fetching the data"
        label="Loading asset models"
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
