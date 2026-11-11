"use client";

import RadialGraph from "@/components/graphs/RadialGraph";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { TodayCalendarWidget } from "@/components/dashboard/TodayCalendarWidget";
import { LowInventoryWidget } from "@/components/dashboard/LowInventoryWidget";
import { NeedsAttentionWidget } from "@/components/dashboard/NeedsAttentionWidget";
import { LocationsSummaryWidget } from "@/components/dashboard/LocationsSummaryWidget";
import { CategoriesSummaryWidget } from "@/components/dashboard/CategoriesSummaryWidget";
import { RequesterDashboardView } from "@/components/dashboard/RequesterDashboardView";
import axios from "axios";
import {
  Droplets,
  FilePieChart,
  Keyboard,
  LibraryBig,
  Microchip,
  CircleArrowRight,
  LayoutDashboard,
  CloudAlert,
  Users,
  ShieldCheck,
  ClipboardList,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "skullet/react";
import { DashboardPageSkeleton } from "@/components/skeletons/AppSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_METADATA } from "@/lib/rbac";
import { useQuery } from "@tanstack/react-query";

export type CountTotal = {
  Assets: number;
  Licenses: number;
  Accessories: number;
  Consumables: number;
  Components: number;
  People: number;
};

export default function Page() {
  const { role, dbUser, isLoading: authLoading } = usePermissions();

  const isRequester = !authLoading && Boolean(dbUser) && role === "requester";

  const {
    data: total,
    isLoading: loading,
    isError: error,
  } = useQuery<CountTotal>({
    queryKey: ["counttotals"],
    queryFn: async () => {
      const response = await axios.get("/api/counttotals");
      return response.data.data;
    },
    enabled: !authLoading && !isRequester,
    staleTime: 1000 * 60 * 2,
  });

  if (authLoading) {
    return <DashboardPageSkeleton />;
  }

  if (isRequester) {
    return <RequesterDashboardView />;
  }

  const data = [
    {
      title: "Assets",
      count: total?.Assets ?? 0,
      icon: LibraryBig,
      url: "/assets/listall",
    },
    {
      title: "Licenses",
      count: total?.Licenses ?? 0,
      icon: FilePieChart,
      url: "/licenses",
    },
    {
      title: "Accessories",
      count: total?.Accessories ?? 0,
      icon: Keyboard,
      url: "/accessories",
    },
    {
      title: "Consumables",
      count: total?.Consumables ?? 0,
      icon: Droplets,
      url: "/consumables",
    },
    {
      title: "Components",
      count: total?.Components ?? 0,
      icon: Microchip,
      url: "/components",
    },
    {
      title: "People",
      count: total?.People ?? 0,
      icon: Users,
      url: "/people",
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex flex-wrap items-center justify-between gap-3 bg-card">
        <div className="flex flex-wrap items-center gap-3">
          <LayoutDashboard strokeWidth={2.2} size={28} />
          <h3 className="text-2xl sm:text-3xl font-semibold">
            {role === "admin" ? "Admin Dashboard" : "Assets Operations Dashboard"}
          </h3>
          {dbUser && (
            <Badge variant="outline" className={ROLE_METADATA[role].badgeClass}>
              {ROLE_METADATA[role].label}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {role === "admin" ? (
            <Link href="/people?tab=roles">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                <ShieldCheck className="h-4 w-4" />
                Users &amp; Roles
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/assets/listall">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                  <LibraryBig className="h-4 w-4" />
                  Manage Assets
                </Button>
              </Link>
              <Link href="/requests">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                  <ClipboardList className="h-4 w-4" />
                  Requests Queue
                </Button>
              </Link>
              <Link href="/maintenances">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                  <Wrench className="h-4 w-4" />
                  Maintenances
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid auto-rows-min gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {data.map((item) => (
          <div
            key={item.title}
            className="w-full relative rounded-[2.5em] p-6 border text-sidebar-foreground hover:bg-primary-foreground transition-transform duration-400 ease-in-out hover:scale-[0.97] active:scale-[0.9]"
          >
            <div className="flex flex-col justify-between h-full gap-20 transition-transform duration-400 ease-in-out group-hover:scale-[0.96]">
              <div className="flex justify-between items-center">
                <span className="font-bold">
                  <item.icon />
                </span>
                <p className="m-0 font-semibold">{item.title}</p>
              </div>

              <Link href={item.url}>
                <div className="flex justify-between items-end">
                  <p className="m-0 font-semibold">View All</p>
                  <CircleArrowRight />
                </div>
              </Link>
            </div>

            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="text-[2.5em] font-semibold transition-transform duration-400 ease-in-out group-hover:scale-105">
                <Skeleton
                  id={`dashboard-kpi-${item.title.toLowerCase()}`}
                  loading={loading}
                  label={`Loading ${item.title} count`}
                  error={
                    !loading && error ? (
                      <CloudAlert className="stroke-red-500 w-10 h-10" />
                    ) : undefined
                  }
                >
                  <span className="tabular-nums">
                    {loading ? "128" : item.count}
                  </span>
                </Skeleton>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Recent Activity (Left 8 cols) + Today & Up Next (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8">
          <RecentActivityWidget />
        </div>
        <div className="lg:col-span-4">
          <TodayCalendarWidget />
        </div>
      </div>

      {/* Row 2: Assets by Status (4 cols) + Low Inventory (4 cols) + Needs Attention (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-4 border rounded-[2em] bg-card p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between pb-3 border-b">
            <h4 className="font-semibold text-base">Assets by Status</h4>
          </div>
          <div className="flex items-center justify-center w-full flex-1 pt-2">
            <RadialGraph />
          </div>
        </div>
        <div className="lg:col-span-4">
          <LowInventoryWidget />
        </div>
        <div className="lg:col-span-4">
          <NeedsAttentionWidget />
        </div>
      </div>

      {/* Row 3: Locations Summary (Left 6 cols) + Categories Summary (Right 6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <LocationsSummaryWidget />
        <CategoriesSummaryWidget />
      </div>
    </div>
  );
}
