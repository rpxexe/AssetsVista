"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSignature,
  FileWarning,
  Inbox,
  KeyRound,
  ShieldAlert,
  UserMinus,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NeedsAttentionData {
  overdueAudits: number;
  overdueCheckins: number;
  unacceptedAcceptances: number;
  pendingRequests: number;
  assetsPastEol: number;
  overdueMaintenances: number;
  licensesExpiringSoon: number;
  employeesOffboardingSoon: number;
  alertIntervalDays: number;
  offboardingDays: number;
}

export function NeedsAttentionWidget() {
  const [collapsed, setCollapsed] = useState(false);

  const { data, isLoading } = useQuery<NeedsAttentionData>({
    queryKey: ["needs-attention"],
    queryFn: async () => {
      const res = await axios.get("/api/dashboard/needs-attention");
      return res.data.data;
    },
    staleTime: 1000 * 60,
  });

  const rows = [
    {
      label: "Audits overdue",
      count: data?.overdueAudits ?? 0,
      href: "/assets/listall?filter=overdue_audit",
      icon: ShieldAlert,
    },
    {
      label: "Checkins overdue",
      count: data?.overdueCheckins ?? 0,
      href: "/assets/listall?filter=due_checkin",
      icon: CalendarClock,
    },
    {
      label: "Unaccepted acceptances",
      count: data?.unacceptedAcceptances ?? 0,
      href: "/acceptances?status=pending",
      icon: FileSignature,
    },
    {
      label: "Pending Requests",
      count: data?.pendingRequests ?? 0,
      href: "/requests?status=pending",
      icon: Inbox,
    },
    {
      label: "Assets past EOL",
      count: data?.assetsPastEol ?? 0,
      href: "/assets/listall?past_eol=1",
      icon: Clock,
    },
    {
      label: "Maintenances overdue",
      count: data?.overdueMaintenances ?? 0,
      href: "/maintenances?status=overdue",
      icon: Wrench,
    },
    {
      label: "Licenses expiring soon",
      count: data?.licensesExpiringSoon ?? 0,
      href: "/licenses?status=expiring",
      icon: KeyRound,
    },
    {
      label: "Employees offboarding soon (with assignments)",
      count: data?.employeesOffboardingSoon ?? 0,
      href: "/people?end_date_within=30&with_assignments=1",
      icon: UserMinus,
    },
  ];

  return (
    <div className="border rounded-[2em] bg-card p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-foreground" />
            <h4 className="font-semibold text-base">Needs Attention</h4>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle Needs Attention widget"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed && (
          <ul className="mt-2 divide-y">
            {rows.map((row) => {
              const Icon = row.icon || FileWarning;
              return (
                <li key={row.label}>
                  <Link
                    href={row.href}
                    className="flex items-center justify-between gap-3 py-2.5 px-1.5 rounded-lg hover:bg-muted/50 transition-colors text-xs"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{row.label}</span>
                    </span>
                    <Badge
                      variant={row.count > 0 ? "default" : "secondary"}
                      className="min-w-[2rem] justify-center tabular-nums shrink-0 font-semibold"
                    >
                      {isLoading ? "…" : row.count}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

