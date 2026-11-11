"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SkeletonSuspense } from "skullet/react";
import PeopleForm from "@/components/forms/People/PeopleForm";
import { PeopleTable } from "@/components/tables/peoples";
import { UserRolesTable } from "@/components/people/UserRolesTable";
import { TablePageSkeleton } from "@/components/skeletons/AppSkeletons";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_METADATA } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, ShieldCheck, Users, UserX } from "lucide-react";

const FILTER_TITLES: Record<string, { title: string; subtitle: string }> = {
  superusers: {
    title: "Superusers",
    subtitle: "Workspace Admins with full system, settings, security & role control",
  },
  admins: {
    title: "Admin Users",
    subtitle: "Privileged operators (Admin & Assets User roles) managing inventory",
  },
  login_enabled: {
    title: "Login Enabled Users",
    subtitle: "People with active AssetsVista portal sign-in access & token tracking",
  },
  login_disabled: {
    title: "Login Disabled Users",
    subtitle: "Suspended user logins and directory-only profiles without portal credentials",
  },
  offboarding: {
    title: "Offboarding Soon",
    subtitle: "Employees approaching departure or overdue for asset/token clearance",
  },
};

function PeoplePageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "roles" ? "roles" : "directory";
  const activeFilter = searchParams?.get("filter") || "all";
  const [activeTab, setActiveTab] = useState<"directory" | "roles">(initialTab);
  const { role, permissions } = usePermissions();
  const roleMeta = ROLE_METADATA[role];
  const filterHeader = FILTER_TITLES[activeFilter];

  useEffect(() => {
    if (searchParams?.get("tab") === "roles") {
      setActiveTab("roles");
    } else if (searchParams?.get("filter")) {
      setActiveTab("directory");
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Users strokeWidth={2.2} size={30} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-3xl font-semibold">
                {filterHeader ? filterHeader.title : "People / Users"}
              </h3>
              {filterHeader && (
                <Badge variant="secondary" className="text-xs">
                  Filtered View
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filterHeader
                ? filterHeader.subtitle
                : "Manage employee profiles, assigned hardware, login access & role-based permissions"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pr-2">
          <Link href="/people/offboarding">
            <Button variant="outline" size="sm" className="gap-1.5">
              <DoorOpen className="h-3.5 w-3.5 text-amber-500" />
              Offboarding Center
            </Button>
          </Link>
          {permissions.canManagePeople && (
            <Link href="/people/deleted">
              <Button variant="outline" size="sm" className="gap-1.5">
                <UserX className="h-3.5 w-3.5 text-red-500" />
                Deleted Users
              </Button>
            </Link>
          )}
          <span className="text-xs text-muted-foreground ml-1">Your Role:</span>
          <Badge variant="outline" className={roleMeta.badgeClass}>
            {roleMeta.label}
          </Badge>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "directory"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 hover:bg-muted text-muted-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            People Directory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "roles"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 hover:bg-muted text-muted-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Role &amp; Access Management
          </button>
        </div>

        {activeTab === "directory" && permissions.canManagePeople && <PeopleForm />}
      </div>

      {/* Tab Content */}
      <div className="min-h-min grid grid-cols-1 gap-4 auto-rows-min">
        {activeTab === "directory" ? (
          <SkeletonSuspense
            id="people-directory-suspense"
            label="Loading people directory"
            skeleton={
              <TablePageSkeleton
                title="People Directory"
                columns={["checkbox", "avatar", "mono", "text", "text", "number", "badge", "actions"]}
              />
            }
          >
            <PeopleTable />
          </SkeletonSuspense>
        ) : (
          <UserRolesTable />
        )}
      </div>
    </div>
  );
}

const PeoplePage = () => {
  return (
    <SkeletonSuspense
      id="people-page-suspense"
      label="Loading people page"
      skeleton={
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <TablePageSkeleton
            title="People Page"
            columns={["checkbox", "avatar", "mono", "text", "text", "number", "badge", "actions"]}
          />
        </div>
      }
    >
      <PeoplePageContent />
    </SkeletonSuspense>
  );
};

export default PeoplePage;
