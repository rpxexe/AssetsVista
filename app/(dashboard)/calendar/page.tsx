"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  CalendarEventType,
  DashboardCalendarEvent,
} from "@/app/api/dashboard/calendar-events/route";

const EVENT_TYPE_FILTERS: { value: CalendarEventType; label: string }[] = [
  { value: "maintenance.start", label: "Maintenance" },
  { value: "asset.audit_due", label: "Audit Due" },
  { value: "asset.expected_checkin", label: "Check-in Due" },
  { value: "asset.eol", label: "Asset EOL" },
  { value: "asset.warranty_expiration", label: "Warranty Expiry" },
  { value: "license.expiration", label: "License Expiry" },
  { value: "license.termination", label: "License Termination" },
  { value: "user.start_date", label: "Onboarding" },
  { value: "user.end_date", label: "Offboarding" },
];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [activeTypes, setActiveTypes] = useState<CalendarEventType[]>([]);

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    [currentMonth]
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
    [currentMonth]
  );

  const typesParam = activeTypes.join(",");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "calendar-events",
      "page",
      gridStart.toISOString(),
      gridEnd.toISOString(),
      typesParam,
    ],
    queryFn: async () => {
      const response = await axios.get<{
        success: boolean;
        events: DashboardCalendarEvent[];
        total: number;
      }>("/api/dashboard/calendar-events", {
        params: {
          start: gridStart.toISOString(),
          end: gridEnd.toISOString(),
          types: typesParam || undefined,
          limit: 500,
        },
      });
      return response.data;
    },
  });

  const events = useMemo(() => data?.events ?? [], [data]);

  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DashboardCalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start);
      if (Number.isNaN(d.getTime())) continue;
      const key = format(d, "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const selectedDayEvents = eventsByDay.get(selectedKey) || [];

  const toggleType = (type: CalendarEventType) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex flex-wrap items-center justify-between gap-3 bg-card">
        <div className="flex items-center gap-3">
          <CalendarIcon strokeWidth={2.2} size={30} />
          <div>
            <h3 className="text-3xl font-semibold">ITAM Calendar</h3>
            <p className="text-xs text-muted-foreground">
              Track audits, maintenance windows, expected check-ins, EOL dates, warranties, licenses &amp; offboarding
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCurrentMonth(now);
              setSelectedDay(now);
            }}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh events"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Type filter bar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Filter:</span>
          <Button
            size="sm"
            variant={activeTypes.length === 0 ? "default" : "outline"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setActiveTypes([])}
          >
            All ({events.length})
          </Button>
          {EVENT_TYPE_FILTERS.map((item) => {
            const active = activeTypes.includes(item.value);
            return (
              <Button
                key={item.value}
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => toggleType(item.value)}
              >
                {item.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Monthly Grid */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <CardDescription className="text-xs">
                {events.length} scheduled item(s) in current view
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground pb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading calendar...
              </div>
            ) : (
              <div className="grid grid-cols-7 border-t border-l rounded-md overflow-hidden">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDay.get(key) || [];
                  const selected = isSameDay(day, selectedDay);
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[92px] p-1.5 border-r border-b text-left flex flex-col gap-1 transition-colors ${
                        selected
                          ? "bg-muted ring-1 ring-inset ring-foreground/40"
                          : "hover:bg-muted/50"
                      } ${!inMonth ? "opacity-45 bg-muted/20" : "bg-card"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            today
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="truncate rounded px-1 py-0.5 text-[10px] bg-secondary text-secondary-foreground border border-border/60"
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-muted-foreground pl-1">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day Agenda Panel */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">
              {format(selectedDay, "EEEE, MMM d, yyyy")}
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedDayEvents.length === 0
                ? "No events scheduled on this date"
                : `${selectedDayEvents.length} item(s) scheduled`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-2 flex-1 max-h-[600px] overflow-y-auto">
            {selectedDayEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Select a highlighted date on the grid or switch filter categories.
              </div>
            ) : (
              selectedDayEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={ev.href}
                  className="block rounded-md border bg-background p-2.5 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ev.categoryLabel}
                        </Badge>
                        {ev.completed && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground break-words">
                        {ev.title}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

