"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { Skeleton } from "skullet/react";
import { SampleTableRows } from "@/components/skeletons/AppSkeletons";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/BulkActionBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { executeBulkAction } from "@/lib/bulkClient";
import { getClientErrorMessage } from "@/lib/errorMessages";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  canAssignRole,
  normalizeUserRole,
  ROLE_METADATA,
  USER_ROLES,
  UserRole,
} from "@/lib/rbac";
import { ProvisionUserModal } from "./ProvisionUserModal";
import { RolePermissionsDialog } from "./RolePermissionsDialog";
import { ExportButton } from "@/components/ExportButton";
import type { ExportColumnDef, ExportSheet } from "@/lib/exportData";

export interface ManagedUser {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  picture?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified?: boolean;
  lastLogin?: string;
  personId?: {
    _id: string;
    name: string;
    username?: string;
    employee_num?: string;
  } | null;
}

interface UsersApiResponse {
  data: ManagedUser[];
  summary: {
    total: number;
    admin: number;
    assets_user: number;
    requester: number;
    suspended: number;
  };
}

export function UserRolesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role: actorRole, permissions, dbUser } = usePermissions();

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const bulk = useBulkSelection();
  const [bulkRole, setBulkRole] = useState<string>("requester");

  const invalidateUsers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["users"] }),
      queryClient.invalidateQueries({ queryKey: ["people"] }),
      queryClient.invalidateQueries({ queryKey: ["current-auth-user"] }),
    ]);
  };

  const { data, isLoading, isError } = useQuery<UsersApiResponse>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await axios.get("/api/users");
      return {
        data: res.data.data || [],
        summary: res.data.summary || {
          total: 0,
          admin: 0,
          assets_user: 0,
          requester: 0,
          suspended: 0,
        },
      };
    },
  });

  const users = data?.data || [];
  const summary = data?.summary;

  const userExportColumns: ExportColumnDef<ManagedUser>[] = useMemo(
    () => [
      { header: "Name", accessor: (u) => u.name || u.username || "-" },
      { header: "Email", accessor: (u) => u.email },
      { header: "Username", accessor: (u) => u.username || "-" },
      {
        header: "Role",
        accessor: (u) => ROLE_METADATA[normalizeUserRole(u.role)].label,
      },
      { header: "Account Status", accessor: (u) => (u.isActive === false ? "Suspended" : "Active") },
      { header: "Linked Directory Profile", accessor: (u) => u.personId?.name || "-" },
      { header: "Employee #", accessor: (u) => u.personId?.employee_num || "-" },
      {
        header: "Last Login",
        accessor: (u) => (u.lastLogin ? new Date(u.lastLogin).toISOString() : "Never"),
      },
    ],
    []
  );

  const roleSummarySheet: ExportSheet = useMemo(
    () => ({
      name: "Role Summary",
      headers: ["Role / Category", "User Count"],
      rows: [
        ["Total Accounts", summary?.total ?? users.length],
        ["Admins", summary?.admin ?? 0],
        ["Assets Users", summary?.assets_user ?? 0],
        ["Request Users", summary?.requester ?? 0],
        ["Suspended Accounts", summary?.suspended ?? 0],
      ],
    }),
    [summary, users.length]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter === "suspended" && u.isActive !== false) return false;
      if (
        roleFilter !== "all" &&
        roleFilter !== "suspended" &&
        u.role !== roleFilter
      ) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${u.name || ""} ${u.email || ""} ${u.username || ""} ${u.role}`
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [users, roleFilter, search]);

  const handleRoleChange = async (userId: string, nextRole: UserRole) => {
    setBusyId(userId);
    try {
      await axios.patch("/api/users", { id: userId, role: nextRole });
      toast({
        title: "Role Updated",
        description: `User role updated to ${ROLE_METADATA[nextRole].label}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["current-auth-user"] }),
      ]);
    } catch (err: any) {
      toast({
        title: "Role Update Denied",
        description: err.response?.data?.message || "Failed to update role.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (target: ManagedUser) => {
    const nextState = target.isActive === false;
    setBusyId(target._id);
    try {
      await axios.patch("/api/users", { id: target._id, isActive: nextState });
      toast({
        title: nextState ? "Account Activated" : "Account Suspended",
        description: `${target.name || target.email} is now ${
          nextState ? "active" : "suspended"
        }.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
      ]);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.response?.data?.message || "Failed to update user status.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setBusyId(userId);
    try {
      await axios.delete(`/api/users?id=${userId}`);
      toast({
        title: "Access Removed",
        description: "User login record deleted from database.",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
      ]);
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const visibleUserIds = filteredUsers.map((u) => u._id);
  const selectedUsers = filteredUsers.filter((u) => bulk.isSelected(u._id));

  const runUserBulk = async (action: string, payload?: Record<string, unknown>) => {
    if (selectedUsers.length === 0) return;
    try {
      const res = await executeBulkAction({
        entity: "user",
        action,
        ids: selectedUsers.map((u) => u._id),
        payload,
      });
      toast({ title: "Bulk Account Update", description: res.message });
      bulk.clear();
      await invalidateUsers();
    } catch (err) {
      toast({
        title: "Bulk Action Failed",
        description: getClientErrorMessage(err, "Failed to update selected accounts."),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Permission Banner when viewing as non-admin */}
      {!permissions.canManageRoles && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-sm">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-muted-foreground">
            You are currently viewing with the{" "}
            <strong className="text-foreground">{ROLE_METADATA[actorRole].label}</strong> role.
            Admin privileges are required to create users, modify roles, or suspend accounts.
          </p>
        </div>
      )}

      {/* Role Summary KPI Cards */}
      <Skeleton id="user-roles-kpis" loading={isLoading} label="Loading role summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: "all", label: "All Users", value: isLoading ? 12 : (summary?.total ?? 0), icon: Users },
            { key: "admin", label: "Admins", value: isLoading ? 2 : (summary?.admin ?? 0), icon: ShieldCheck },
            {
              key: "assets_user",
              label: "Assets Users",
              value: isLoading ? 4 : (summary?.assets_user ?? 0),
              icon: UserCheck,
            },
            {
              key: "requester",
              label: "Request Users",
              value: isLoading ? 6 : (summary?.requester ?? 0),
              icon: Users,
            },
            { key: "suspended", label: "Suspended", value: isLoading ? 0 : (summary?.suspended ?? 0), icon: Ban },
          ].map((card) => {
            const Icon = card.icon;
            const active = roleFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setRoleFilter(card.key)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  active
                    ? "border-foreground bg-muted shadow-sm"
                    : "bg-card hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{card.label}</span>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </button>
            );
          })}
        </div>
      </Skeleton>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search login users by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <ExportButton
            filename="user_roles_access"
            sheetName="User Accounts"
            data={filteredUsers}
            selectedData={selectedUsers}
            allData={users}
            columns={userExportColumns}
            summarySheet={roleSummarySheet}
          />
          <RolePermissionsDialog />
          <ProvisionUserModal
            actorRole={actorRole}
            disabled={!permissions.canManageRoles}
          />
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedUsers.length}
        entityLabel="user account"
        onClearSelection={bulk.clear}
        exportConfig={{
          filename: "user_roles_access_selected",
          sheetName: "User Accounts",
          data: selectedUsers,
          columns: userExportColumns,
        }}
        extraContent={
          permissions.canManageRoles && canAssignRole(actorRole) ? (
            <div className="flex items-center gap-1.5">
              <Select value={bulkRole} onValueChange={setBulkRole}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Set Role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_METADATA[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => runUserBulk("role", { role: bulkRole })}
              >
                Assign Role
              </Button>
            </div>
          ) : null
        }
        actions={
          permissions.canManageRoles
            ? [
                {
                  id: "bulk-activate-users",
                  label: "Activate",
                  icon: <UserCheck size={14} />,
                  confirmTitle: `Activate ${selectedUsers.length} selected account(s)?`,
                  onExecute: () => runUserBulk("activate"),
                },
                {
                  id: "bulk-suspend-users",
                  label: "Suspend",
                  icon: <Ban size={14} />,
                  variant: "secondary",
                  confirmTitle: `Suspend ${selectedUsers.length} selected account(s)?`,
                  confirmDescription:
                    "Suspended accounts cannot sign in. Your own account and the last active Admin are protected.",
                  onExecute: () => runUserBulk("suspend"),
                },
                {
                  id: "bulk-delete-users",
                  label: "Delete Selected",
                  icon: <Trash2 size={14} />,
                  variant: "destructive",
                  confirmTitle: `Delete ${selectedUsers.length} selected login account(s)?`,
                  confirmDescription:
                    "Deleted users will lose login access. Your own account and the last active Admin cannot be deleted.",
                  onExecute: () => runUserBulk("delete"),
                },
              ]
            : []
        }
      />

      {/* Table */}
      <Skeleton
        id={`user-roles-table-${roleFilter}`}
        loading={isLoading}
        label="Loading user access records"
        empty={!isLoading && !isError && filteredUsers.length === 0}
        emptyMessage={
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={false} disabled aria-label="Select all user accounts" />
                  </TableHead>
                  <TableHead>User Account</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked Directory Profile</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No matching user accounts found.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        }
        error={
          !isLoading && isError ? (
            <p className="text-center text-red-500 py-8">Failed to load user access records.</p>
          ) : undefined
        }
      >
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(visibleUserIds)}
                    onCheckedChange={(checked) => bulk.toggleAll(visibleUserIds, !!checked)}
                    aria-label="Select all user accounts"
                  />
                </TableHead>
                <TableHead>User Account</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked Directory Profile</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SampleTableRows
                  columns={["checkbox", "avatar", "badge", "badge", "text", "date", "actions"]}
                  rowCount={5}
                />
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = dbUser?._id === u._id;
                  const normalizedRole = normalizeUserRole(u.role);
                  const meta = ROLE_METADATA[normalizedRole];
                  const initials = (u.name || u.email || "U")
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const canEditTarget =
                    permissions.canManageRoles && canAssignRole(actorRole);

                  return (
                    <TableRow key={u._id}>
                      <TableCell>
                        <Checkbox
                          checked={bulk.isSelected(u._id)}
                          onCheckedChange={(checked) => bulk.toggleOne(u._id, !!checked)}
                          aria-label={`Select ${u.name || u.email}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.picture} alt={u.name || u.email} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <span>{u.name || u.email.split("@")[0]}</span>
                              {isSelf && (
                                <Badge variant="secondary" className="text-[10px]">
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {canEditTarget ? (
                          <Select
                            value={normalizedRole}
                            disabled={busyId === u._id}
                            onValueChange={(val) =>
                              handleRoleChange(u._id, val as UserRole)
                            }
                          >
                            <SelectTrigger className="w-[155px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {USER_ROLES.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {ROLE_METADATA[r].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={meta.badgeClass}>
                            {meta.label}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {u.isActive !== false ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="h-3 w-3" />
                            Suspended
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {u.personId?._id ? (
                          <Link
                            href={`/people/${u.personId._id}`}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
                          >
                            {u.personId.name}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {u.lastLogin
                          ? formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true })
                          : "Pre-provisioned"}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          {canEditTarget && !isSelf && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === u._id}
                              onClick={() => handleToggleActive(u)}
                              className="h-8 text-xs"
                            >
                              {u.isActive !== false ? "Suspend" : "Activate"}
                            </Button>
                          )}

                          {canEditTarget && !isSelf && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  disabled={busyId === u._id}
                                  className="h-8 w-8 border text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Login Account?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This removes login access for{" "}
                                    <strong>{u.name || u.email}</strong>. Their People
                                    directory profile and asset audit history will remain intact.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(u._id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove Access
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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

