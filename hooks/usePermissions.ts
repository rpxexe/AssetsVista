"use client";

import { getPermissionsForRole, RolePermissions, UserRole } from "@/lib/rbac";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface CurrentDbUserResult {
  user?: {
    _id: string;
    name?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
  };
  person?: {
    _id: string;
    name?: string;
  };
}

export function usePermissions(): {
  role: UserRole;
  permissions: RolePermissions;
  isActive: boolean;
  dbUser: CurrentDbUserResult["user"] | null;
  person: CurrentDbUserResult["person"] | null;
  isLoading: boolean;
} {
  const { user, isLoaded } = useUser();

  const { data, isLoading: queryLoading } = useQuery<CurrentDbUserResult>({
    queryKey: ["current-db-user", user?.id],
    queryFn: async () => {
      const res = await axios.post("/api/users/sync");
      return res.data?.data ?? {};
    },
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });

  const role: UserRole = (data?.user?.role as UserRole) || "user";
  const isActive = data?.user?.isActive !== false;

  return {
    role,
    permissions: getPermissionsForRole(role),
    isActive,
    dbUser: data?.user ?? null,
    person: data?.person ?? null,
    isLoading: !isLoaded || (Boolean(user?.id) && queryLoading),
  };
}

