"use client";

import * as React from "react";
import {
  ClipboardCheck,
  ClipboardList,
  HardDriveUpload,
  Laptop,
  LibraryBig,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { data } from "@/Data/navData";
import { usePermissions } from "@/hooks/usePermissions";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { permissions, isLoading, dbUser, person } = usePermissions();
  const enforced = !isLoading && Boolean(dbUser);
  const isRequester = enforced && !permissions.canCreateEditAssets;

  const visibleNavAssets = React.useMemo(() => {
    if (!isRequester) return data.navAsset;

    const requesterItems = [
      {
        title: "Requestable Items",
        url: "/assets/listall?status=Requestable",
        icon: HardDriveUpload,
      },
      {
        title: "My Requests",
        url: "/requests",
        icon: ClipboardList,
      },
      {
        title: "My Acceptances",
        url: "/acceptances",
        icon: ClipboardCheck,
      },
      ...(person?._id
        ? [
            {
              title: "My Assigned Assets",
              url: `/people/${person._id}`,
              icon: Laptop,
            },
          ]
        : []),
    ];

    return [
      {
        title: "Assets & Requests",
        url: "#",
        icon: LibraryBig,
        isActive: true,
        items: requesterItems,
      },
    ];
  }, [isRequester, person?._id]);

  const visibleProjects = React.useMemo(() => {
    if (!enforced || permissions.canCreateEditAssets) {
      if (!enforced || permissions.canViewPeople) return data.projects;
      return data.projects.filter((p) => p.url !== "/people");
    }
    // Requesters do not manage standalone inventory categories (Licenses/Accessories/etc.)
    return [];
  }, [enforced, permissions.canCreateEditAssets, permissions.canViewPeople]);

  const visibleSettings = React.useMemo(() => {
    if (!enforced) return data.navSetting;
    if (!permissions.canManageSettings) return [];
    return data.navSetting.map((group) => ({
      ...group,
      items: group.items?.filter(
        (item) => item.url !== "/setup" || permissions.canRunSetup
      ),
    }));
  }, [enforced, permissions.canManageSettings, permissions.canRunSetup]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.dashboard} />
        <NavMain items={visibleNavAssets} />
        {visibleProjects.length > 0 && <NavProjects projects={visibleProjects} />}
        {(!enforced || permissions.canViewReports) && (
          <NavMain items={data.navReport} />
        )}
        {visibleSettings.length > 0 && <NavMain items={visibleSettings} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
