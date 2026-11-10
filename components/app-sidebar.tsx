"use client";

import * as React from "react";

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
  const { permissions, isLoading, dbUser } = usePermissions();
  const enforced = !isLoading && Boolean(dbUser);

  const visibleProjects = React.useMemo(() => {
    if (!enforced || permissions.canViewPeople) return data.projects;
    return data.projects.filter((p) => p.url !== "/people");
  }, [enforced, permissions.canViewPeople]);

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
        <NavMain items={data.navAsset} />
        <NavProjects projects={visibleProjects} />
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
