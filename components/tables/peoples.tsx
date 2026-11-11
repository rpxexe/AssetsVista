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
import { ChevronDown, Eye, Loader2, Trash } from "lucide-react";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import PeopleEditForm from "../forms/People/PeopleEditForm";
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
import { ExportButton } from "@/components/ExportButton";
import type { ExportColumnDef } from "@/lib/exportData";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import { ROLE_METADATA, normalizeUserRole, UserRole } from "@/lib/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { BulkActionBar } from "@/components/BulkActionBar";
import { executeBulkAction } from "@/lib/bulkClient";
import { getClientErrorMessage } from "@/lib/errorMessages";

export type Person = {
  _id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  job_title?: string;
  employee_num?: string;
  username?: string;
  company?: {
    name: string;
  };
  location?: {
    name: string;
  };
  department?: {
    name: string;
  };
  assets_count?: number;
  licenses_count?: number;
  user_id?: string | null;
  role?: UserRole | null;
  isActive?: boolean | null;
  lastLogin?: string | null;
  notes?: string;
  image?: string;
};

export function PeopleTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions } = usePermissions();
  const searchParams = useSearchParams();
  const endDateWithin = searchParams ? searchParams.get("end_date_within") : null;
  const withAssignments = searchParams ? searchParams.get("with_assignments") : null;

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
    queryKey: ["people", endDateWithin, withAssignments],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (endDateWithin) params.set("end_date_within", endDateWithin);
      if (withAssignments) params.set("with_assignments", withAssignments);
      const qs = params.toString();
      const response = await axios.get(qs ? `/api/core/people?${qs}` : "/api/core/people");
      return response.data.data;
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/core/people?id=${id}`);
      toast({
        title: response.data.message || "Person Deleted",
        description: "Person deleted successfully",
        variant: "destructive",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["counttotals"] });
    } catch (error: any) {
      console.error("Error deleting person:", error);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.message || "Failed to delete person",
        variant: "destructive",
      });
    }
  };

  const peopleExportColumns: ExportColumnDef<Person>[] = React.useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (p) => p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "-",
      },
      { id: "employee_num", header: "Employee #", accessor: (p) => p.employee_num || "-" },
      { id: "email", header: "Email", accessor: (p) => p.email || "-" },
      { header: "Phone", accessor: (p) => p.phone || "-" },
      { id: "title", header: "Job Title", accessor: (p) => p.title || p.job_title || "-" },
      { id: "department.name", header: "Department", accessor: (p) => p.department?.name || "-" },
      { id: "location.name", header: "Location", accessor: (p) => p.location?.name || "-" },
      { header: "Company", accessor: (p) => p.company?.name || "-" },
      { id: "assets_count", header: "Assigned Assets", accessor: (p) => p.assets_count ?? 0 },
      { header: "Assigned Licenses", accessor: (p) => p.licenses_count ?? 0 },
      { id: "role", header: "Role / Access", accessor: (p) => p.role || "Directory Only" },
    ],
    []
  );

  const columns: ColumnDef<Person>[] = [
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
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const id = row.original._id;
        const displayName =
          row.original.name ||
          `${row.original.first_name || ""} ${row.original.last_name || ""}`.trim() ||
          "User";

        return (
          <div className="flex items-center gap-2.5">
            <ImageThumbnail
              src={row.original.image}
              alt={displayName}
              fallback="person"
              size="sm"
              rounded="full"
            />
            <Link
              href={`/people/${id}`}
              className="font-semibold text-primary hover:underline flex items-center gap-1.5"
            >
              {displayName}
            </Link>
          </div>
        );
      },
    },
    {
      accessorKey: "employee_num",
      header: "Employee #",
      cell: ({ row }) => (
        <div className="font-mono text-xs">{row.getValue("employee_num") || "-"}</div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div className="text-sm">{row.getValue("email") || "-"}</div>,
    },
    {
      accessorKey: "title",
      header: "Job Title",
      cell: ({ row }) => <div>{row.original.title || row.original.job_title || "-"}</div>,
    },
    {
      accessorKey: "assets_count",
      header: "Assigned Assets",
      cell: ({ row }) => {
        const count = row.original.assets_count ?? 0;
        return (
          <Link href={`/people/${row.original._id}`}>
            <Badge
              variant={count > 0 ? "secondary" : "outline"}
              className={
                count > 0
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 cursor-pointer"
                  : "text-muted-foreground"
              }
            >
              {count} {count === 1 ? "Asset" : "Assets"}
            </Badge>
          </Link>
        );
      },
    },
    {
      accessorKey: "department.name",
      header: "Department",
      cell: ({ row }) => <div>{row.original.department?.name || "-"}</div>,
    },
    {
      accessorKey: "location.name",
      header: "Location",
      cell: ({ row }) => <div>{row.original.location?.name || "-"}</div>,
    },
    {
      accessorKey: "role",
      header: "Role / Access",
      cell: ({ row }) => {
        const r = row.original.role;
        const active = row.original.isActive;
        if (!r) {
          return (
            <Badge variant="outline" className="text-muted-foreground font-normal">
              Directory Only
            </Badge>
          );
        }
        const meta = ROLE_METADATA[normalizeUserRole(r)];
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={meta.badgeClass}>
              {meta.label}
            </Badge>
            {active === false && (
              <Badge variant="destructive" className="text-[10px]">
                Suspended
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const id = row.original._id;

        return (
          <div className="flex items-center gap-1.5">
            <Link href={`/people/${id}`}>
              <Button size="icon" variant="outline" className="h-8 w-8" title="View Profile">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {permissions.canManagePeople && <PeopleEditForm id={id} />}
            {permissions.canManagePeople && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border text-red-500 hover:text-red-700"
                    title="Delete Person"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this person. If this person has assigned assets,
                      you must check them in first.
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

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between py-4 gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          {(endDateWithin || withAssignments) && (
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
              <span className="font-medium text-foreground">
                Offboarding soon
                {endDateWithin ? ` (${endDateWithin}d)` : ""}
                {withAssignments ? " • with assets" : ""}
              </span>
              <Link
                href="/people"
                className="text-muted-foreground hover:text-foreground underline ml-1"
              >
                Reset
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            filename="people_directory"
            sheetName="People Directory"
            data={table.getFilteredRowModel().rows.map((r) => r.original)}
            allData={data}
            selectedData={table.getFilteredSelectedRowModel().rows.map((r) => r.original)}
            columns={peopleExportColumns}
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
        const selectedPeople = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
        return (
          <BulkActionBar
            selectedCount={selectedPeople.length}
            entityLabel="person"
            onClearSelection={() => setRowSelection({})}
            exportConfig={{
              filename: "people_selected",
              sheetName: "Selected People",
              data: selectedPeople,
              columns: peopleExportColumns,
            }}
            actions={
              permissions.canManagePeople
                ? [
                    {
                      id: "bulk-delete-people",
                      label: "Delete Selected",
                      icon: <Trash size={14} />,
                      variant: "destructive",
                      confirmTitle: `Delete ${selectedPeople.length} selected person record(s)?`,
                      confirmDescription:
                        "People who currently hold assigned assets will be automatically skipped for safety.",
                      onExecute: async () => {
                        try {
                          const res = await executeBulkAction({
                            entity: "people",
                            action: "delete",
                            ids: selectedPeople.map((p) => p._id),
                          });
                          toast({ title: "Bulk Action Complete", description: res.message });
                          setRowSelection({});
                          await Promise.all([
                            refetch(),
                            queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
                          ]);
                        } catch (err) {
                          toast({
                            title: "Bulk Delete Failed",
                            description: getClientErrorMessage(
                              err,
                              "Unable to delete selected people."
                            ),
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
          Error while fetching people data
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
                    No people found. Click &quot;Add Person&quot; above to create one.
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

export default PeopleTable;
