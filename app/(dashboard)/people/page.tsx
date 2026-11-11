"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PeopleForm from "@/components/forms/People/PeopleForm";
import { PeopleTable } from "@/components/tables/peoples";
import { UserRolesTable } from "@/components/people/UserRolesTable";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_METADATA } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Users } from "lucide-react";

function PeoplePageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "roles" ? "roles" : "directory";
  const [activeTab, setActiveTab] = useState<"directory" | "roles">(initialTab);
  const { role, permissions } = usePermissions();
  const roleMeta = ROLE_METADATA[role];

  useEffect(() => {
    if (searchParams?.get("tab") === "roles") {
      setActiveTab("roles");
    }
  }, [searchParams]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Users strokeWidth={2.2} size={30} />
          <div>
            <h3 className="text-3xl font-semibold">People / Users</h3>
            <p className="text-xs text-muted-foreground">
              Manage employee profiles, assigned hardware &amp; role-based access permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-2">
          <span className="text-xs text-muted-foreground">Your Role:</span>
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
          <Suspense
            fallback={
              <div className="w-full flex items-center justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
              </div>
            }
          >
            <PeopleTable />
          </Suspense>
        ) : (
          <UserRolesTable />
        )}
      </div>
    </div>
  );
}

const PeoplePage = () => {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center p-12">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      }
    >
      <PeoplePageContent />
    </Suspense>
  );
};

export default PeoplePage;
