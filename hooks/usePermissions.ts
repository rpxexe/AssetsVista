"use client";

import {
  getPermissionsForRole,
  normalizeUserRole,
  RolePermissions,
  UserRole,
} from "@/lib/rbac";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface CurrentDbUser {
  _id: string;
  name?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  personId?: string;
  workspaceId: string;
  picture?: string;
}

export interface CurrentPerson {
  _id: string;
  name?: string;
  email?: string;
  username?: string;
}

interface CurrentAuthResult {
  user?: CurrentDbUser | null;
  person?: CurrentPerson | null;
  role?: UserRole;
  permissions?: RolePermissions;
  canAccessDevTools?: boolean;
}

export function usePermissions(): {
  role: UserRole;
  permissions: RolePermissions;
  isActive: boolean;
  canAccessDevTools: boolean;
  dbUser: CurrentDbUser | null;
  person: CurrentPerson | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery<CurrentAuthResult>({
    queryKey: ["current-auth-user"],
    queryFn: async () => {
      try {
        const res = await axios.get("/api/auth/me");
        return res.data?.data ?? {};
      } catch {
        return { user: null, person: null };
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: false,
  });

  const role: UserRole = normalizeUserRole(data?.user?.role || data?.role);
  const isActive = data?.user?.isActive !== false;

  return {
    role,
    permissions: getPermissionsForRole(role),
    isActive,
    canAccessDevTools: Boolean(data?.canAccessDevTools),
    dbUser: data?.user ?? null,
    person: data?.person ?? null,
    isLoading,
  };
}
