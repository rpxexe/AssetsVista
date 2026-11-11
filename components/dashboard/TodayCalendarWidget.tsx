"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { format, isSameDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardCalendarEvent } from "@/app/api/dashboard/calendar-events/route";

export function TodayCalendarWidget() {
  const [collapsed, setCollapsed] = useState(false);

  const { data, isLoading } = useQuery<{
    events: DashboardCalendarEvent[];
    total: number;
    truncated: boolean;
  }>({
    queryKey: ["calendar-events", "upcoming-7d"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const res = await axios.get(
        `/api/dashboard/calendar-events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}&limit=10`
      );
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const events = data?.events || [];
  const total = data?.total ?? 0;
  const remainingCount = Math.max(0, total - events.length);

  const grouped = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const groups = new Map<string, { label: string; fullDate: string; items: DashboardCalendarEvent[] }>();
    for (const ev of events) {
      const d = new Date(ev.start);
      const key = format(d, "yyyy-MM-dd");
      if (!groups.has(key)) {
        const label = isSameDay(d, today)
          ? "Today"
          : isSameDay(d, tomorrow)
          ? "Tomorrow"
          : format(d, "EEEE");
        groups.set(key, {
          label,
          fullDate: format(d, "MMMM d, yyyy"),
          items: [],
        });
      }
      groups.get(key)!.items.push(ev);
    }
    return Array.from(groups.entries());
  }, [events]);

  return (
    <div className="border rounded-[2em] bg-card p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b">
          <Link href="/calendar" className="flex items-center gap-2 hover:underline">
            <CalendarDays className="h-4 w-4 text-foreground" />
            <h4 className="font-semibold text-base">Today &amp; Up Next</h4>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle Today and Up Next widget"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed && (
          <div className="mt-3 max-h-[340px] overflow-auto space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No scheduled maintenance, audits, EOL dates, or renewals in the next 7 days.
              </div>
            ) : (
              grouped.map(([key, grp]) => (
                <div key={key} className="border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b text-xs font-medium">
                    <span>{grp.label}</span>
                    <span className="text-muted-foreground">{grp.fullDate}</span>
                  </div>
                  <div className="divide-y">
                    {grp.items.map((ev) => (
                      <Link
                        key={ev.id}
                        href={ev.href}
                        className="flex items-start gap-2.5 px-3 py-2 text-xs hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-[11px] text-muted-foreground shrink-0 w-11 pt-0.5">
                          {ev.allDay ? "all-day" : format(new Date(ev.start), "HH:mm")}
                        </span>
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        <span
                          className={`leading-snug ${
                            ev.completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {ev.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="pt-3 mt-3 border-t">
          <Link href="/calendar" className="block">
            <Button variant="outline" size="sm" className="w-full rounded-full text-xs">
              {remainingCount > 0
                ? `+${remainingCount} more on the calendar`
                : "Open Full Calendar"}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

