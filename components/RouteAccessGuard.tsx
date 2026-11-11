"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_METADATA, RolePermissions } from "@/lib/rbac";

function getRequiredPermission(
  pathname: string,
  ownPersonId?: string
): { key: keyof RolePermissions; section: string } | null {
  if (pathname.startsWith("/setup")) {
    return { key: "canRunSetup", section: "System Setup Wizard" };
  }
  if (pathname.startsWith("/settings")) {
    return { key: "canManageSettings", section: "System Settings" };
  }
  if (pathname.startsWith("/people")) {
    if (ownPersonId && pathname === `/people/${ownPersonId}`) {
      return null;
    }
    return { key: "canViewPeople", section: "People & Role Directory" };
  }
  if (pathname.startsWith("/reports")) {
    return { key: "canViewReports", section: "Reports & Audit Analytics" };
  }
  if (pathname.startsWith("/maintenances")) {
    return { key: "canManageMaintenances", section: "Asset Maintenances" };
  }
  if (
    pathname.startsWith("/licenses") ||
    pathname.startsWith("/accessories") ||
    pathname.startsWith("/consumables") ||
    pathname.startsWith("/components")
  ) {
    return { key: "canCreateEditAssets", section: "Inventory Operations" };
  }
  return null;
}

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const queryClient = useQueryClient();
  const { role, permissions, isActive, dbUser, person, isLoading } = usePermissions();

  const enforced = !isLoading && Boolean(dbUser);

  const handleSignOut = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // Ignore network errors during sign-out cleanup
    } finally {
      queryClient.clear();
      window.location.replace("/login");
    }
  };

  if (enforced && !isActive) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-6">
        <div className="max-w-md w-full border rounded-[2em] bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
            <ShieldAlert className="h-6 w-6 text-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight">Account Disabled</h2>
            <p className="text-sm text-muted-foreground">
              Your workspace account is currently inactive. Contact an Admin to restore access.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const requirement = getRequiredPermission(pathname, person?._id);
  if (enforced && requirement && !permissions[requirement.key]) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-6">
        <div className="max-w-md w-full border rounded-[2em] bg-card p-8 text-center space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
            <ShieldAlert className="h-6 w-6 text-foreground" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="text-xs uppercase tracking-wider">
              Role: {ROLE_METADATA[role].label}
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
            <p className="text-sm text-muted-foreground">
              Your current role does not have permission to access{" "}
              <span className="font-medium text-foreground">{requirement.section}</span>.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Link href="/admin">
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default RouteAccessGuard;
