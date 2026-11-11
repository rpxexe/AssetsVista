"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  CheckCircle2,
  CircleArrowRight,
  ClipboardCheck,
  ClipboardList,
  HardDriveUpload,
  Laptop,
  Plus,
} from "lucide-react";
import { Skeleton } from "skullet/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_METADATA } from "@/lib/rbac";

interface RequesterSummaryResponse {
  personId: string | null;
  counts: {
    assignedAssets: number;
    requestableAssets: number;
    pendingRequests: number;
    totalRequests: number;
    pendingAcceptances: number;
  };
  assignedAssets: Array<{
    _id: string;
    asset_name: string;
    asset_tag?: string;
    serial_number?: string;
    checkout_date?: string;
    status?: { name?: string };
    asset_model?: { name?: string };
  }>;
  recentRequests: Array<{
    _id: string;
    item_type: string;
    item_name: string;
    item_tag?: string;
    quantity: number;
    status: "pending" | "fulfilled" | "canceled";
    createdAt?: string;
  }>;
  pendingAcceptances: Array<{
    _id: string;
    checkoutable_type: string;
    item_name: string;
    item_tag?: string;
    createdAt?: string;
  }>;
}

export function RequesterDashboardView() {
  const { dbUser, person, role } = usePermissions();

  const { data, isLoading } = useQuery<RequesterSummaryResponse>({
    queryKey: ["requester-summary"],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/requester-summary");
      return res.data.data;
    },
    staleTime: 1000 * 60,
  });

  const displayName =
    dbUser?.name || person?.name || dbUser?.email?.split("@")[0] || "Team Member";
  const resolvedPersonId = data?.personId || person?._id;
  const counts = data?.counts;

  const kpiCards = [
    {
      title: "My Assigned Assets",
      count: counts?.assignedAssets ?? 0,
      icon: Laptop,
      url: resolvedPersonId ? `/people/${resolvedPersonId}` : "/requests",
      actionLabel: resolvedPersonId ? "View My Hardware" : "View Requests",
    },
    {
      title: "Requestable Items",
      count: counts?.requestableAssets ?? 0,
      icon: HardDriveUpload,
      url: "/assets/listall?status=Requestable",
      actionLabel: "Browse Catalog",
    },
    {
      title: "My Pending Requests",
      count: counts?.pendingRequests ?? 0,
      icon: ClipboardList,
      url: "/requests",
      actionLabel: "Track Requests",
    },
    {
      title: "Pending Acceptances",
      count: counts?.pendingAcceptances ?? 0,
      icon: ClipboardCheck,
      url: "/acceptances",
      actionLabel: "Review Sign-offs",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="border rounded-[2.5em] p-5 w-full flex flex-wrap items-center justify-between gap-4 bg-card">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Welcome, {displayName}
            </h3>
            <Badge variant="outline" className={ROLE_METADATA[role].badgeClass}>
              {ROLE_METADATA[role].label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Browse requestable company hardware, submit new equipment requests, and manage your
            assigned assets &amp; EULA acceptances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/assets/listall?status=Requestable">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
              <HardDriveUpload className="h-4 w-4" />
              Browse Requestable Items
            </Button>
          </Link>
          <Link href="/requests?create=1">
            <Button size="sm" className="gap-1.5 rounded-full">
              <Plus className="h-4 w-4" />
              Request Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Role-Focused Self-Service KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="w-full relative rounded-[2em] p-6 border bg-card text-sidebar-foreground transition-transform duration-300 hover:scale-[0.985]"
            >
              <div className="flex flex-col justify-between h-full gap-14">
                <div className="flex justify-between items-center">
                  <Icon className="h-5 w-5 text-foreground" />
                  <p className="m-0 text-sm font-semibold text-right">{item.title}</p>
                </div>

                <Link href={item.url}>
                  <div className="flex justify-between items-end pt-2">
                    <p className="m-0 text-xs font-semibold">{item.actionLabel}</p>
                    <CircleArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </div>

              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <span className="text-[2.4em] font-semibold tabular-nums">
                  <Skeleton
                    id={`requester-kpi-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    loading={isLoading}
                    label={`Loading ${item.title}`}
                  >
                    <span>{isLoading ? "12" : item.count}</span>
                  </Skeleton>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: My Recent Requests */}
        <Card className="lg:col-span-7 rounded-[2em]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 border-b">
            <div>
              <CardTitle className="text-base">My Recent Item Requests</CardTitle>
              <CardDescription className="text-xs">
                Status updates on your requested hardware, accessories &amp; licenses
              </CardDescription>
            </div>
            <Link href="/requests">
              <Button variant="outline" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <Skeleton
              id="requester-recent-requests"
              loading={isLoading}
              label="Loading recent item requests"
              empty={!isLoading && !data?.recentRequests?.length}
              emptyMessage={
                <div className="text-center py-10 space-y-3">
                  <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">No item requests yet</p>
                    <p className="text-xs text-muted-foreground">
                      Need a laptop, monitor, accessory, or license? Submit a request in one click.
                    </p>
                  </div>
                  <Link href="/requests?create=1">
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      Submit First Request
                    </Button>
                  </Link>
                </div>
              }
            >
              <div className="space-y-2.5">
                {isLoading
                  ? [
                      { name: "#AST-014 - MacBook Pro 16", meta: "Asset · Qty 1 · Oct 24, 2026", status: "pending" },
                      { name: "Dell UltraSharp 27 Monitor", meta: "Accessory · Qty 1 · Oct 22, 2026", status: "fulfilled" },
                      { name: "JetBrains All Products Pack", meta: "License · Qty 1 · Oct 18, 2026", status: "fulfilled" },
                    ].map((sample, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{sample.name}</p>
                          <p className="text-xs text-muted-foreground">{sample.meta}</p>
                        </div>
                        <Badge variant="outline" className="capitalize shrink-0">
                          {sample.status}
                        </Badge>
                      </div>
                    ))
                  : data?.recentRequests?.map((req) => (
                      <div
                        key={req._id}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {req.item_tag ? `#${req.item_tag} - ` : ""}
                            {req.item_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {req.item_type} · Qty {req.quantity}
                            {req.createdAt
                              ? ` · ${format(new Date(req.createdAt), "MMM d, yyyy")}`
                              : ""}
                          </p>
                        </div>
                        <Badge
                          variant={
                            req.status === "pending"
                              ? "default"
                              : req.status === "fulfilled"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize shrink-0"
                        >
                          {req.status}
                        </Badge>
                      </div>
                    ))}
              </div>
            </Skeleton>
          </CardContent>
        </Card>

        {/* Right: My Assigned Equipment & Pending Acceptances */}
        <Card className="lg:col-span-5 rounded-[2em]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 border-b">
            <div>
              <CardTitle className="text-base">My Assigned Equipment &amp; Sign-offs</CardTitle>
              <CardDescription className="text-xs">
                Hardware checked out to you &amp; pending EULA confirmations
              </CardDescription>
            </div>
            {resolvedPersonId && (
              <Link href={`/people/${resolvedPersonId}`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Details
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {Boolean(data?.pendingAcceptances?.length) && (
              <div className="rounded-xl border bg-muted/40 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck className="h-4 w-4 text-foreground shrink-0" />
                  <p className="text-xs font-medium">
                    {data!.pendingAcceptances.length} item acceptance(s) waiting for your signature
                  </p>
                </div>
                <Link href="/acceptances">
                  <Button size="sm" variant="default" className="h-7 text-xs">
                    Review
                  </Button>
                </Link>
              </div>
            )}

            <Skeleton
              id="requester-assigned-assets"
              loading={isLoading}
              label="Loading assigned equipment"
              empty={!isLoading && !data?.assignedAssets?.length}
              emptyMessage={
                <div className="text-center py-8 space-y-2">
                  <CheckCircle2 className="h-7 w-7 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">No equipment currently assigned</p>
                  <p className="text-xs text-muted-foreground">
                    Assigned assets will appear here once checked out by your Assets team.
                  </p>
                </div>
              }
            >
              <div className="space-y-2.5">
                {isLoading
                  ? [
                      { name: "#AST-014 - MacBook Pro 16", meta: "Apple M3 Pro · SN: C02XYZ123", status: "Deployed" },
                      { name: "#AST-089 - Dell UltraSharp", meta: "U2723QE 4K · SN: DL987654", status: "Deployed" },
                    ].map((sample, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{sample.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{sample.meta}</p>
                        </div>
                        <Badge variant="outline" className="text-[11px] shrink-0">
                          {sample.status}
                        </Badge>
                      </div>
                    ))
                  : data?.assignedAssets?.map((asset) => (
                      <Link
                        key={asset._id}
                        href={`/assets/view/${asset._id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {asset.asset_tag ? `#${asset.asset_tag} - ` : ""}
                            {asset.asset_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {asset.asset_model?.name || "Asset"}
                            {asset.serial_number ? ` · SN: ${asset.serial_number}` : ""}
                          </p>
                        </div>
                        {asset.status?.name && (
                          <Badge variant="outline" className="text-[11px] shrink-0">
                            {asset.status.name}
                          </Badge>
                        )}
                      </Link>
                    ))}
              </div>
            </Skeleton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

