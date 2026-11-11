"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { NavGroupItem } from "@/Data/navData";
import Link from "next/link";

interface SidebarAssetCounts {
  total: number;
  checkedOut: number;
  dueAudit: number;
  dueCheckin: number;
  pastEol: number;
  deleted: number;
  statusCounts: Record<string, number>;
}

interface SidebarPeopleCounts {
  total: number;
  superusers: number;
  admins: number;
  deleted: number;
  loginEnabled: number;
  loginDisabled: number;
  offboardingSoon: number;
  offboardingAtRisk: number;
}

function resolveCount(
  assetCounts: SidebarAssetCounts | undefined,
  peopleCounts: SidebarPeopleCounts | undefined,
  countKey?: string
): { value: number | undefined; alert?: boolean } {
  if (!countKey) return { value: undefined };
  if (countKey.startsWith("people:")) {
    if (!peopleCounts) return { value: undefined };
    const key = countKey.slice("people:".length);
    if (key === "total") return { value: peopleCounts.total };
    if (key === "superusers") return { value: peopleCounts.superusers };
    if (key === "admins") return { value: peopleCounts.admins };
    if (key === "deleted") return { value: peopleCounts.deleted };
    if (key === "loginEnabled") return { value: peopleCounts.loginEnabled };
    if (key === "loginDisabled") return { value: peopleCounts.loginDisabled };
    if (key === "offboardingSoon") {
      return {
        value: peopleCounts.offboardingSoon,
        alert: peopleCounts.offboardingAtRisk > 0,
      };
    }
    return { value: undefined };
  }

  if (!assetCounts) return { value: undefined };
  if (countKey === "total") return { value: assetCounts.total };
  if (countKey === "dueAudit") return { value: assetCounts.dueAudit };
  if (countKey === "dueCheckin") return { value: assetCounts.dueCheckin };
  if (countKey === "pastEol") return { value: assetCounts.pastEol };
  if (countKey === "deleted") return { value: assetCounts.deleted };
  if (countKey.startsWith("status:")) {
    const statusName = countKey.slice("status:".length).toLowerCase();
    return { value: assetCounts.statusCounts?.[statusName] ?? 0 };
  }
  return { value: undefined };
}

export function NavMain({ items }: { items: NavGroupItem[] }) {
  const hasAssetCounts = items.some((group) =>
    group.items?.some((sub) => Boolean(sub.countKey && !sub.countKey.startsWith("people:")))
  );
  const hasPeopleCounts = items.some((group) =>
    group.items?.some((sub) => Boolean(sub.countKey && sub.countKey.startsWith("people:")))
  );

  const { data: assetCounts } = useQuery<SidebarAssetCounts>({
    queryKey: ["asset-sidebar-counts"],
    queryFn: async () => {
      const res = await axios.get("/api/core/asset/sidebar-counts");
      return res.data.data;
    },
    enabled: hasAssetCounts,
    staleTime: 1000 * 30,
  });

  const { data: peopleCounts } = useQuery<SidebarPeopleCounts>({
    queryKey: ["people-sidebar-counts"],
    queryFn: async () => {
      const res = await axios.get("/api/core/people/sidebar-counts");
      return res.data.data;
    },
    enabled: hasPeopleCounts,
    staleTime: 1000 * 30,
  });

  return (
    <SidebarGroup className="-mb-4">
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => {
                    const resolved = resolveCount(assetCounts, peopleCounts, subItem.countKey);
                    return (
                      <div key={subItem.title}>
                        {subItem.separatorBefore && (
                          <div className="my-1.5 border-t border-sidebar-border/70" />
                        )}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url} className="flex items-center w-full gap-2">
                              {subItem.icon && (
                                <subItem.icon className={cn("shrink-0", subItem.iconClassName)} />
                              )}
                              <span className="truncate flex-1">{subItem.title}</span>
                              {resolved.value !== undefined && (
                                <span
                                  className={cn(
                                    "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-mono tabular-nums leading-none shrink-0",
                                    resolved.alert
                                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-semibold"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {resolved.value}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </div>
                    );
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
