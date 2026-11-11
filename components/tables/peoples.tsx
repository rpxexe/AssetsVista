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
import {
  ChevronDown,
  Crown,
  DoorOpen,
  Eye,
  KeyRound,
  Loader2,
  Trash,
  UserCheck,
  UserMinus,
} from "lucide-react";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import PeopleEditForm from "../forms/People/PeopleEditForm";
import {
  OffboardPersonDialog,
  OffboardTargetPerson,
} from "@/components/people/OffboardPersonDialog";
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
  total_asset_value?: number;
  licenses_count?: number;
  active_api_keys_count?: number;
  user_id?: string | null;
  role?: UserRole | null;
  isActive?: boolean | null;
  lastLogin?: string | null;
  end_date?: string | null;
  is_account_only?: boolean;
  is_overdue?: boolean;
  days_remaining?: number | null;
  needs_clearance?: boolean;
  offboarding_risk?: "cleared" | "warning" | "critical";
  notes?: string;
  image?: string;
};

interface PeopleSidebarSummary {
  total: number;
  superusers: number;
  admins: number;
  deleted: number;
  loginEnabled: number;
  loginDisabled: number;
  offboardingSoon: number;
  offboardingAtRisk: number;
}

const FILTER_CHIPS: Array<{
  id: string;
  label: string;
  href: string;
  countKey?: keyof PeopleSidebarSummary;
}> = [
  { id: "all", label: "All People", href: "/people", countKey: "total" },
  { id: "superusers", label: "Superusers", href: "/people?filter=superusers", countKey: "superusers" },
  { id: "admins", label: "Admin Users", href: "/people?filter=admins", countKey: "admins" },
  { id: "login_enabled", label: "Login Enabled", href: "/people?filter=login_enabled", countKey: "loginEnabled" },
  { id: "login_disabled", label: "Login Disabled", href: "/people?filter=login_disabled", countKey: "loginDisabled" },
];

export function PeopleTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions, dbUser } = usePermissions();
  const searchParams = useSearchParams();
  const activeFilter = searchParams ? searchParams.get("filter") || "all" : "all";
  const endDateWithin = searchParams ? searchParams.get("end_date_within") : null;
  const withAssignments = searchParams ? searchParams.get("with_assignments") : null;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [togglingUserId, setTogglingUserId] = React.useState<string | null>(null);
  const [offboardTarget, setOffboardTarget] = React.useState<OffboardTargetPerson | null>(null);

  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Person[]>({
    queryKey: ["people", activeFilter, endDateWithin, withAssignments],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter && activeFilter !== "all") params.set("filter", activeFilter);
      if (endDateWithin) params.set("end_date_within", endDateWithin);
      if (withAssignments) params.set("with_assignments", withAssignments);
      const qs = params.toString();
      const response = await axios.get(qs ? `/api/core/people?${qs}` : "/api/core/people");
      return response.data.data;
    },
  });

  const { data: sidebarSummary } = useQuery<PeopleSidebarSummary>({
    queryKey: ["people-sidebar-counts"],
    queryFn: async () => {
      const res = await axios.get("/api/core/people/sidebar-counts");
      return res.data.data;
    },
    staleTime: 1000 * 30,
  });

  const invalidatePeopleCaches = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["people-sidebar-counts"] }),
      queryClient.invalidateQueries({ queryKey: ["deleted-people"] }),
      queryClient.invalidateQueries({ queryKey: ["people-offboarding"] }),
      queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
      queryClient.invalidateQueries({ queryKey: ["users"] }),
    ]);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await axios.delete(`/api/core/people?id=${id}`);
      toast({
        title: "Moved to Deleted Users",
        description:
          response.data.message || "Person moved to Deleted Users Trash (login & tokens suspended).",
      });
      await invalidatePeopleCaches();
    } catch (error: any) {
      console.error("Error deleting person:", error);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.message || "Failed to delete person",
        variant: "destructive",
      });
    }
  };

  const handleToggleLogin = async (person: Person) => {
    if (!person.user_id) return;
    const nextState = person.isActive === false;
    setTogglingUserId(person.user_id);
    try {
      await axios.patch("/api/users", {
        id: person.user_id,
        isActive: nextState,
      });
      toast({
        title: nextState ? "Login Enabled" : "Login Disabled",
        description: nextState
          ? `${person.name || person.email} can now sign in to AssetsVista.`
          : `Portal sign-in suspended & active API tokens revoked for ${person.name || person.email}.`,
      });
      await invalidatePeopleCaches();
    } catch (err) {
      toast({
        title: "Update Failed",
        description: getClientErrorMessage(err, "Unable to change login status."),
        variant: "destructive",
      });
    } finally {
      setTogglingUserId(null);
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
      { header: "Asset Value ($)", accessor: (p) => p.total_asset_value ?? 0 },
      { header: "Assigned Licenses", accessor: (p) => p.licenses_count ?? 0 },
      { id: "role", header: "Role / Access", accessor: (p) => p.role || "Directory Only" },
      {
        header: "Login Status",
        accessor: (p) =>
          p.user_id ? (p.isActive !== false ? "Login Enabled" : "Login Disabled") : "No Login",
      },
      { header: "Active API Keys", accessor: (p) => p.active_api_keys_count ?? 0 },
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
          disabled={row.original.is_account_only}
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
        const isAccountOnly = Boolean(row.original.is_account_only);

        return (
          <div className="flex items-center gap-2.5">
            <ImageThumbnail
              src={row.original.image}
              alt={displayName}
              fallback="person"
              size="sm"
              rounded="full"
            />
            <div>
              <Link
                href={isAccountOnly ? "/people?tab=roles" : `/people/${id}`}
                className="font-semibold text-primary hover:underline flex items-center gap-1.5"
              >
                {displayName}
              </Link>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {isAccountOnly && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Account Only
                  </Badge>
                )}
                {row.original.is_overdue && row.original.needs_clearance && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Offboarding Overdue
                  </Badge>
                )}
              </div>
            </div>
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
        const totalValue = Number(row.original.total_asset_value ?? 0);
        return (
          <div className="flex items-center gap-1.5">
            <Link
              href={row.original.is_account_only ? "/people?tab=roles" : `/people/${row.original._id}`}
            >
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
            {totalValue > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground">
                ${totalValue.toLocaleString()}
              </span>
            )}
          </div>
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
      header: "Role & Login",
      cell: ({ row }) => {
        const r = row.original.role;
        const active = row.original.isActive;
        const apiKeys = row.original.active_api_keys_count ?? 0;

        if (!r) {
          return (
            <Badge variant="outline" className="text-muted-foreground font-normal">
              No Login (Directory)
            </Badge>
          );
        }

        const normalized = normalizeUserRole(r);
        const meta = ROLE_METADATA[normalized];
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={meta.badgeClass}>
              {normalized === "admin" && <Crown className="h-3 w-3 mr-1 text-amber-500" />}
              {meta.label}
            </Badge>
            {active === false ? (
              <Badge variant="destructive" className="text-[10px]">
                Login Disabled
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
              >
                Login Enabled
              </Badge>
            )}
            {apiKeys > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                <KeyRound className="h-2.5 w-2.5" />
                {apiKeys}
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
        const p = row.original;
        const id = p._id;
        const isAccountOnly = Boolean(p.is_account_only);
        const canToggleLogin =
          permissions.canManageRoles && Boolean(p.user_id) && p.user_id !== dbUser?._id;
        const isBusy = Boolean(p.user_id && togglingUserId === p.user_id);
        const showOffboard =
          permissions.canManagePeople &&
          !isAccountOnly &&
          (Boolean(p.end_date) || (p.assets_count ?? 0) > 0 || (p.licenses_count ?? 0) > 0);

        return (
          <div className="flex items-center gap-1.5">
            <Link href={isAccountOnly ? "/people?tab=roles" : `/people/${id}`}>
              <Button size="icon" variant="outline" className="h-8 w-8" title="View Profile">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>

            {canToggleLogin && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={isBusy}
                title={p.isActive === false ? "Enable Login Access" : "Disable Login & Revoke API Keys"}
                onClick={() => handleToggleLogin(p)}
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : p.isActive === false ? (
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                ) : (
                  <UserMinus className="h-4 w-4 text-amber-500" />
                )}
              </Button>
            )}

            {showOffboard && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 text-amber-600 dark:text-amber-400"
                title="Complete Offboarding Clearance"
                onClick={() => setOffboardTarget(p)}
              >
                <DoorOpen className="h-4 w-4" />
              </Button>
            )}

            {permissions.canManagePeople && !isAccountOnly && <PeopleEditForm id={id} />}

            {permissions.canManagePeople && !isAccountOnly && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 border text-red-500 hover:text-red-700"
                    title="Move to Deleted Users Trash"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Move to Deleted Users Trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This safely moves the person record into Deleted Users Trash, suspends their
                      login access, and revokes any active API tokens. You can restore or purge
                      them later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => handleDelete(id)}
                    >
                      Move to Trash
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
    <div className="w-full space-y-2">
      {/* Quick Snipe-IT Sidebar Filter Strip */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2">
        {FILTER_CHIPS.map((chip) => {
          const isCurrent = activeFilter === chip.id && !endDateWithin;
          const count = chip.countKey && sidebarSummary ? sidebarSummary[chip.countKey] : undefined;
          return (
            <Link
              key={chip.id}
              href={chip.href}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{chip.label}</span>
              {count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0 text-[10px] font-mono ${
                    isCurrent ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}

        <Link
          href="/people/offboarding"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium bg-card hover:bg-muted text-amber-700 dark:text-amber-300 border-amber-500/30"
        >
          <DoorOpen className="h-3.5 w-3.5" />
          <span>Offboarding Soon</span>
          {sidebarSummary && (
            <span className="rounded-full px-1.5 py-0 text-[10px] font-mono bg-amber-500/15">
              {sidebarSummary.offboardingSoon}
            </span>
          )}
        </Link>

        {permissions.canManagePeople && (
          <Link
            href="/people/deleted"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <span>Deleted Users</span>
            {sidebarSummary && (
              <span className="rounded-full px-1.5 py-0 text-[10px] font-mono bg-muted">
                {sidebarSummary.deleted}
              </span>
            )}
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between py-3 gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          {(endDateWithin || withAssignments || activeFilter !== "all") && (
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
              <span className="font-medium text-foreground">
                {activeFilter !== "all"
                  ? activeFilter.replace("_", " ")
                  : `Offboarding soon${endDateWithin ? ` (${endDateWithin}d)` : ""}`}
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
        const selectedPeople = table
          .getFilteredSelectedRowModel()
          .rows.map((r) => r.original)
          .filter((p) => !p.is_account_only);

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
                      label: "Move to Trash",
                      icon: <Trash size={14} />,
                      variant: "destructive",
                      confirmTitle: `Move ${selectedPeople.length} selected person record(s) to Deleted Users Trash?`,
                      confirmDescription:
                        "People with assigned assets are safely skipped. Linked logins & API keys will be suspended.",
                      onExecute: async () => {
                        try {
                          const res = await executeBulkAction({
                            entity: "people",
                            action: "delete",
                            ids: selectedPeople.map((p) => p._id),
                          });
                          toast({ title: "Moved to Trash", description: res.message });
                          setRowSelection({});
                          await invalidatePeopleCaches();
                        } catch (err) {
                          toast({
                            title: "Bulk Action Failed",
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

      <DataTableSkullet
        id="peoples-table"
        isLoading={isLoading}
        isError={Boolean(error)}
        errorMessage="Error while fetching people data"
        label="Loading people directory"
        table={table}
        colSpan={columns.length}
        emptyText='No people match this view. Try another filter or click "Add Person" above.'
        columnOverrides={{ name: "avatar" }}
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

      <OffboardPersonDialog
        person={offboardTarget}
        open={Boolean(offboardTarget)}
        onOpenChange={(open) => {
          if (!open) setOffboardTarget(null);
        }}
      />
    </div>
  );
}

export default PeopleTable;
