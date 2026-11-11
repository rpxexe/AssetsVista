"use client";

import RadialGraph from "@/components/graphs/RadialGraph";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { TodayCalendarWidget } from "@/components/dashboard/TodayCalendarWidget";
import { LowInventoryWidget } from "@/components/dashboard/LowInventoryWidget";
import { NeedsAttentionWidget } from "@/components/dashboard/NeedsAttentionWidget";
import { LocationsSummaryWidget } from "@/components/dashboard/LocationsSummaryWidget";
import { CategoriesSummaryWidget } from "@/components/dashboard/CategoriesSummaryWidget";
import axios from "axios";
import {
  Droplets,
  FilePieChart,
  Keyboard,
  LibraryBig,
  Microchip,
  CircleArrowRight,
  LayoutDashboard,
  Loader2,
  CloudAlert,
  Users,
  Rocket,
  CheckCircle2,
  Circle,
  Database,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type CountTotal = {
  Assets: number;
  Licenses: number;
  Accessories: number;
  Consumables: number;
  Components: number;
  People: number;
};

export default function Page() {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    staleTime: 1000 * 60 * 2, // 2 minutes fresh dashboard counters
  });

  const { data: setupStatus } = useQuery<{
    setup_completed: boolean;
    checklist?: Record<string, boolean>;
  }>({
    queryKey: ["setup-status"],
    queryFn: async () => {
      const res = await axios.get("/api/setup/status");
      return res.data;
    },
    staleTime: 1000 * 60 * 10, // Setup completion rarely changes after initial onboarding
  });

  const isEmptyWorkspace =
    Boolean(total) &&
    total!.Assets === 0 &&
    total!.Licenses === 0 &&
    total!.Accessories === 0 &&
    total!.Consumables === 0 &&
    total!.Components === 0 &&
    total!.People === 0;

  const handleLoadDemoData = async () => {
    setSeedingDemo(true);
    try {
      const res = await axios.post("/api/demo/seed");
      await queryClient.invalidateQueries();
      toast({
        title: "Demo Data Loaded",
        description:
          res.data?.message ||
          "Sample inventory, people, settings, and activity logs added to your workspace.",
      });
    } catch (err) {
      toast({
        title: "Could not load demo data",
        description: getClientErrorMessage(err, "Failed to populate demo data."),
        variant: "destructive",
      });
    } finally {
      setSeedingDemo(false);
    }
  };

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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <LayoutDashboard strokeWidth={2.2} size={28} />
          <h3 className="text-3xl font-semibold ">Dashboard</h3>
        </div>
        {isEmptyWorkspace && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadDemoData}
            disabled={seedingDemo}
            className="gap-2 rounded-full"
          >
            {seedingDemo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {seedingDemo ? "Loading Demo Data..." : "Load Demo Data"}
          </Button>
        )}
      </div>

      {/* Onboarding Setup Banner for New Workspaces */}
      {setupStatus && !setupStatus.setup_completed && !bannerDismissed && (
        <div className="border bg-card rounded-[2em] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
          <div className="space-y-2 pr-6">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-foreground" />
              <h4 className="font-semibold text-base">
                Welcome to AssetsVista — Finish Your Workspace Setup
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Run the 4-step Setup Wizard to verify pre-flight checks, configure your organization,
              and seed standard status labels &amp; categories — or populate demo records immediately.
            </p>
            {setupStatus.checklist && (
              <div className="flex flex-wrap gap-3 pt-1 text-xs">
                {[
                  { label: "Company", done: setupStatus.checklist.hasCompany },
                  { label: "Location", done: setupStatus.checklist.hasLocation },
                  { label: "Status Labels", done: setupStatus.checklist.hasStatuses },
                  { label: "Categories", done: setupStatus.checklist.hasCategories },
                ].map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1">
                    {c.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={c.done ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {c.label}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleLoadDemoData}
              disabled={seedingDemo}
              className="gap-2 rounded-full"
            >
              {seedingDemo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {seedingDemo ? "Loading..." : "Load Demo Data"}
            </Button>
            <Link href="/setup">
              <Button className="gap-2 rounded-full">
                <Rocket className="h-4 w-4" />
                Launch Setup Wizard
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss setup banner"
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
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
                <p className="m-0 font-semibold ">{item.title}</p>
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
                {loading ? (
                  <Loader2 className="animate-spin text-muted-foreground" />
                ) : error ? (
                  <CloudAlert className="stroke-red-500 w-10 h-10" />
                ) : (
                  item.count
                )}
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
