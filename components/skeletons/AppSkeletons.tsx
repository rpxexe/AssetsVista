"use client";

import React from "react";
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import { Skeleton, SkeletonBox } from "skullet/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SampleColumnKind =
  | "checkbox"
  | "thumb"
  | "avatar"
  | "mono"
  | "text"
  | "subtext"
  | "badge"
  | "number"
  | "date"
  | "progress"
  | "actions";

const TEXT_SAMPLES = [
  "MacBook Pro 16 M3",
  "Dell UltraSharp 27",
  "ThinkPad X1 Carbon",
  "Cisco Catalyst 2960",
  "Logitech MX Keys",
  "Adobe Creative Cloud",
];

const SECONDARY_SAMPLES = [
  "Engineering Operations",
  "San Francisco HQ",
  "IT Infrastructure",
  "Product Design",
  "Corporate Security",
  "Finance & Legal",
];

function renderSampleByKind(kind: SampleColumnKind, rowIdx: number) {
  switch (kind) {
    case "checkbox":
      return <Checkbox disabled aria-hidden />;
    case "thumb":
      return <div className="h-10 w-10 rounded-lg border bg-muted/40 shrink-0" />;
    case "avatar":
      return (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border bg-muted/40 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{TEXT_SAMPLES[rowIdx % TEXT_SAMPLES.length]}</p>
            <p className="text-xs text-muted-foreground">member@company.com</p>
          </div>
        </div>
      );
    case "mono":
      return <span className="font-mono text-xs font-semibold">AST-0014{rowIdx + 1}</span>;
    case "badge":
      return (
        <Badge variant="outline" className="text-xs">
          Ready to Deploy
        </Badge>
      );
    case "number":
      return <span className="tabular-nums font-medium">$1,240.00</span>;
    case "date":
      return <span className="text-xs text-muted-foreground whitespace-nowrap">Oct 24, 2026</span>;
    case "subtext":
      return (
        <div>
          <p className="text-xs font-medium">{TEXT_SAMPLES[rowIdx % TEXT_SAMPLES.length]}</p>
          <p className="text-[11px] text-muted-foreground">
            {SECONDARY_SAMPLES[rowIdx % SECONDARY_SAMPLES.length]}
          </p>
        </div>
      );
    case "progress":
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 rounded-full border bg-muted/40" />
          <span className="text-xs font-mono">45%</span>
        </div>
      );
    case "actions":
      return (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled />
          <Button size="icon" variant="outline" className="h-8 w-8" disabled />
        </div>
      );
    case "text":
    default:
      return <span>{TEXT_SAMPLES[rowIdx % TEXT_SAMPLES.length]}</span>;
  }
}

/**
 * Renders realistic sample TableRows inside an existing TableBody while loading
 * so Skullet can measure exact column widths, text baselines, and control blocks.
 */
export function SampleTableRows({
  columns,
  rowCount = 6,
}: {
  columns: SampleColumnKind[];
  rowCount?: number;
}) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIdx) => (
        <TableRow key={`skullet-row-${rowIdx}`}>
          {columns.map((kind, colIdx) => (
            <TableCell key={`skullet-cell-${rowIdx}-${colIdx}`}>
              {renderSampleByKind(kind, rowIdx)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function inferColumnKind(columnId: string): SampleColumnKind {
  const id = columnId.toLowerCase();
  if (id === "select") return "checkbox";
  if (id === "image") return "thumb";
  if (id === "actions") return "actions";
  if (
    id.includes("status") ||
    id === "action_type" ||
    id === "role" ||
    id === "type" ||
    id === "item_type" ||
    id === "category_name" ||
    id === "category.name"
  ) {
    return "badge";
  }
  if (id.includes("date") || id.includes("created") || id.includes("expiry") || id.includes("termination")) {
    return "date";
  }
  if (id.includes("cost") || id.includes("price") || id.includes("value")) {
    return "number";
  }
  if (
    id === "qty" ||
    id === "min_amt" ||
    id === "seats" ||
    id === "assets" ||
    id === "department" ||
    id === "warranty" ||
    id.includes("count")
  ) {
    return "number";
  }
  if (id.includes("email")) {
    return "text";
  }
  if (
    id.includes("tag") ||
    id.includes("serial") ||
    id === "employee_num" ||
    id === "product_key" ||
    id === "model_no"
  ) {
    return "mono";
  }
  return "text";
}

interface DataTableSkulletProps<TData> {
  id: string;
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  label?: string;
  table: TanStackTable<TData>;
  colSpan: number;
  emptyText?: string;
  rowCount?: number;
  containerClassName?: string;
  tableClassName?: string;
  columnOverrides?: Record<string, SampleColumnKind>;
}

/**
 * Shared Skullet wrapper for TanStack Table views across the application.
 */
export function DataTableSkullet<TData>({
  id,
  isLoading,
  isError = false,
  errorMessage = "Error while fetching the data",
  label = "Loading table data",
  table,
  colSpan,
  emptyText = "No results.",
  rowCount = 6,
  containerClassName = "rounded-md border overflow-x-auto",
  tableClassName = "min-w-max w-full",
  columnOverrides,
}: DataTableSkulletProps<TData>) {
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const sampleKinds = visibleColumns.map(
    (col) => columnOverrides?.[col.id] ?? inferColumnKind(col.id)
  );

  const renderTableHeader = () => (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead key={header.id}>
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );

  const emptyTableNode = (
    <div className={containerClassName}>
      <Table className={tableClassName}>
        {renderTableHeader()}
        <TableBody>
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center">
              {emptyText}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Skeleton
      id={id}
      loading={isLoading}
      label={label}
      empty={!isLoading && !isError && rows.length === 0}
      emptyMessage={emptyTableNode}
      error={
        !isLoading && isError ? (
          <p className="text-center text-red-500 py-8">{errorMessage}</p>
        ) : undefined
      }
    >
      <div className={containerClassName}>
        <Table className={tableClassName}>
          {renderTableHeader()}
          <TableBody>
            {isLoading ? (
              <SampleTableRows columns={sampleKinds} rowCount={rowCount} />
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Skeleton>
  );
}

/**
 * Shared Skullet wrapper for Radix Select dropdown option lists.
 */
export function SelectOptionsSkullet({
  id,
  isLoading,
  isError,
  errorText = "Failed to fetch data",
  isEmpty = false,
  emptyText = "No options found",
  count = 5,
  children,
}: {
  id: string;
  isLoading: boolean;
  isError?: boolean;
  errorText?: string;
  isEmpty?: boolean;
  emptyText?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Skeleton
      id={id}
      loading={isLoading}
      label="Loading options"
      empty={!isLoading && !isError && isEmpty}
      emptyMessage={
        <div className="p-2 text-sm text-muted-foreground text-center">
          {emptyText}
        </div>
      }
      error={
        !isLoading && isError ? (
          <div className="w-full flex items-center justify-center p-2">
            <p className="text-muted-foreground text-red-600 text-sm">{errorText}</p>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-1 p-1">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="rounded-sm py-1.5 pl-2 pr-8 text-sm">
              <span>{SECONDARY_SAMPLES[idx % SECONDARY_SAMPLES.length]}</span>
            </div>
          ))}
        </div>
      ) : (
        children
      )}
    </Skeleton>
  );
}

/**
 * Fallback skeleton for Suspense-wrapped table pages.
 */
export function TablePageSkeleton({
  title = "Inventory Records",
  columns = ["checkbox", "thumb", "mono", "text", "badge", "date", "actions"],
}: {
  title?: string;
  columns?: SampleColumnKind[];
}) {
  return (
    <Skeleton id={`suspense-${title.toLowerCase().replace(/\s+/g, "-")}`} loading label={`Loading ${title}`}>
      <div className="w-full space-y-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="h-9 w-64 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            Filter items...
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Export
            </Button>
            <Button variant="outline" size="sm" disabled>
              Columns
            </Button>
          </div>
        </div>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((_, idx) => (
                  <TableHead key={idx}>Column Header</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <SampleTableRows columns={columns} rowCount={6} />
            </TableBody>
          </Table>
        </div>
      </div>
    </Skeleton>
  );
}

/**
 * Full dashboard route skeleton matching app/(dashboard)/admin/page.tsx layout.
 */
export function DashboardPageSkeleton() {
  return (
    <Skeleton id="dashboard-shell" loading label="Loading dashboard" className="w-full">
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="border rounded-[2.5em] p-4 w-full flex flex-wrap items-center justify-between gap-3 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md border bg-muted/40" />
            <h3 className="text-2xl sm:text-3xl font-semibold">Assets Operations Dashboard</h3>
            <Badge variant="outline">Workspace Role</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full" disabled>
              Quick Action
            </Button>
          </div>
        </div>

        <div className="grid auto-rows-min gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {["Assets", "Licenses", "Accessories", "Consumables", "Components", "People"].map(
            (title) => (
              <div
                key={title}
                className="w-full relative rounded-[2.5em] p-6 border bg-card"
              >
                <div className="flex flex-col justify-between h-full gap-20">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-5 rounded border bg-muted/40" />
                    <p className="m-0 font-semibold">{title}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="m-0 font-semibold">View All</p>
                    <div className="h-5 w-5 rounded-full border bg-muted/40" />
                  </div>
                </div>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <span className="text-[2.5em] font-semibold tabular-nums">128</span>
                </div>
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-8 border rounded-[2em] bg-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h4 className="font-semibold text-base">Recent Activity</h4>
              <Button variant="outline" size="sm" disabled>
                Export
              </Button>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SampleTableRows
                    columns={["date", "text", "badge", "text", "text"]}
                    rowCount={5}
                  />
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="lg:col-span-4 border rounded-[2em] bg-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h4 className="font-semibold text-base">Today &amp; Up Next</h4>
            </div>
            <div className="space-y-3">
              {["Today", "Tomorrow"].map((day) => (
                <div key={day} className="border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b text-xs font-medium">
                    <span>{day}</span>
                    <span>October 24, 2026</span>
                  </div>
                  <div className="divide-y">
                    {[0, 1].map((idx) => (
                      <div key={idx} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                        <span className="w-11">09:30</span>
                        <span className="flex-1">Scheduled asset maintenance review</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Skeleton>
  );
}

/**
 * Circular donut chart + 2-column legend skeleton matching RadialGraph.tsx.
 */
export function RadialGraphSkeleton() {
  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="w-full flex items-center justify-end gap-1 mb-1">
        <Button type="button" size="sm" variant="secondary" className="h-6 px-2 text-[11px]" disabled>
          By Status
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled>
          By Type
        </Button>
      </div>
      <div className="h-[240px] w-full flex items-center justify-center">
        <div className="relative h-[180px] w-[180px] flex items-center justify-center">
          <SkeletonBox width={180} height={180} radius="9999px" />
          <div className="absolute h-[96px] w-[96px] rounded-full bg-card" />
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2">
        {["Ready to Deploy", "Deployed", "Pending", "Archived"].map((label) => (
          <div key={label} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="rounded-full h-2.5 w-2.5 shrink-0 border" />
              <span className="truncate">{label}</span>
            </div>
            <span className="text-muted-foreground tabular-nums">(24)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 7x5 calendar grid skeleton matching app/(dashboard)/calendar/page.tsx.
 */
export function CalendarGridSkeleton() {
  return (
    <div className="grid grid-cols-7 border-t border-l rounded-md overflow-hidden">
      {Array.from({ length: 35 }).map((_, idx) => (
        <div
          key={idx}
          className="min-h-[92px] p-1.5 border-r border-b flex flex-col gap-1 bg-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium inline-flex items-center justify-center w-6 h-6">
              {(idx % 30) + 1}
            </span>
          </div>
          {idx % 3 === 0 && (
            <div className="rounded px-1 py-0.5 text-[10px] border">
              Warranty renewal
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Full-page skeleton matching app/(dashboard)/people/[id]/page.tsx.
 */
export function PersonDetailSkeleton() {
  return (
    <Skeleton id="person-detail" loading label="Loading person profile" className="w-full">
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[2.5em] p-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full border bg-muted/40" />
            <div className="h-12 w-12 rounded-full border bg-muted/40" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Alexandra Morgan</h2>
                <Badge variant="outline">EMP-0142</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Senior Systems Engineer (@amorgan)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Sign-Off Sheet
            </Button>
            <Button variant="outline" size="icon" disabled />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: "Assigned Assets", val: "4", sub: "items checked out" },
            { title: "Asset Value", val: "$5,420", sub: "total hardware cost" },
            { title: "Assigned Licenses", val: "6", sub: "software seats" },
            { title: "Activity Events", val: "14", sub: "logs recorded" },
          ].map((card) => (
            <div key={card.title} className="border rounded-2xl p-4 flex flex-col justify-between bg-card">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase">{card.title}</span>
                <div className="h-4 w-4 rounded border bg-muted/40" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold">{card.val}</span>
                <span className="text-xs text-muted-foreground ml-1">{card.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/20 text-xs">
          {[
            { label: "Email", value: "alexandra.morgan@company.com" },
            { label: "Phone", value: "+1 (555) 234-8910" },
            { label: "Department / Company", value: "Engineering / AssetsVista" },
            { label: "Location", value: "San Francisco HQ" },
          ].map((attr) => (
            <div key={attr.label} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-muted/40 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground">{attr.label}</p>
                <p className="font-medium truncate">{attr.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checkout Date</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SampleTableRows
                columns={["mono", "text", "text", "mono", "badge", "date", "number"]}
                rowCount={4}
              />
            </TableBody>
          </Table>
        </div>
      </div>
    </Skeleton>
  );
}

/**
 * Skeleton layout for app/(dashboard)/dev-tools/page.tsx while checking permissions.
 */
export function DevToolsSkeleton() {
  return (
    <Skeleton id="dev-tools-page" loading label="Loading developer tools" className="w-full">
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0 max-w-5xl">
        <div className="border rounded-[2.5em] p-5 bg-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl border bg-muted/60" />
            <div>
              <h1 className="text-2xl font-semibold">Developer Seed &amp; Reset</h1>
              <p className="text-xs text-muted-foreground">
                Private developer console for workspace testing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full" disabled>
              Dashboard
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["Populate Dummy Data", "Reset Workspace Database"].map((title) => (
            <div key={title} className="rounded-[1.75em] border bg-card p-6 space-y-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Manage sample inventory records, taxonomies, people, and activity logs for local testing.
              </p>
              <div className="flex gap-2">
                <Button disabled>Primary Action</Button>
                <Button variant="outline" disabled>
                  Secondary Action
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Skeleton>
  );
}

/**
 * Skeleton layout for app/(dashboard)/assets/view/[id]/page.tsx matching its 2-column dossier view.
 */
export function AssetDetailSkeleton() {
  return (
    <Skeleton id="asset-detail-page" loading label="Loading asset dossier" className="w-full">
      <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
        {/* Breadcrumb & Hero Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[1.75em] p-5 bg-card">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-9 w-9 rounded-full border bg-muted/50 shrink-0" />
            <div className="h-14 w-14 rounded-xl border bg-muted/40 shrink-0" />
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  #AST-0142
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Ready to Deploy
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight truncate">
                MacBook Pro 16 M3 Workstation
              </h1>
              <p className="text-xs text-muted-foreground">
                Apple · MacBook Pro 16 (A2991) · S/N C02ZN1X9MD6R
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled>
              Check Out Asset
            </Button>
            <Button size="sm" variant="outline" disabled>
              Audit
            </Button>
            <Button size="sm" variant="outline" disabled>
              Print Tag
            </Button>
            <Button size="sm" variant="outline" disabled>
              Edit
            </Button>
          </div>
        </div>

        {/* Main 2-column Asymmetric Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          {/* Left Primary Dossier */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex gap-1 border-b px-4 pt-3 overflow-x-auto">
              {["Details", "Maintenances (2)", "Acceptances (1)", "Requests (0)", "History (8)"].map(
                (tab, idx) => (
                  <Button
                    key={tab}
                    size="sm"
                    variant={idx === 0 ? "default" : "ghost"}
                    className="rounded-b-none"
                    disabled
                  >
                    {tab}
                  </Button>
                )
              )}
            </div>

            <div className="p-5 space-y-6">
              {/* Top 3 status cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Operational Status", val: "Ready to Deploy" },
                  { label: "Current Custody", val: "Unassigned / In Stock" },
                  { label: "Expected Checkin & Audit", val: "Due in 45 days" },
                ].map((box) => (
                  <div key={box.label} className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
                    <p className="text-xs text-muted-foreground">{box.label}</p>
                    <p className="text-sm font-semibold">{box.val}</p>
                  </div>
                ))}
              </div>

              {/* Split Specs + Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-6">
                <div className="rounded-xl border divide-y">
                  {[
                    ["Asset Tag", "AST-0142"],
                    ["Asset Name", "MacBook Pro 16 M3 Workstation"],
                    ["Serial Number", "C02ZN1X9MD6R"],
                    ["Current Value", "$1,840.00"],
                    ["Purchase Cost", "$2,499.00"],
                    ["Warranty Coverage", "36 months · Active"],
                    ["Purchase Date", "Feb 12, 2025"],
                    ["Device EOL Date", "Feb 12, 2028"],
                    ["Default Location", "San Francisco HQ"],
                    ["Company", "AssetsVista Inc."],
                    ["Department", "Platform Engineering"],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground font-medium">{k}</span>
                      <span className="font-medium text-foreground">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Device EOL</span>
                        <span>14 / 36 mos · 39%</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Depreciation</span>
                        <span>26% depreciated</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted" />
                    </div>
                    <div className="h-28 rounded-lg border bg-muted/20" />
                  </div>

                  <div className="rounded-xl border p-4 space-y-2.5">
                    {[
                      ["Purchase Cost", "$2,499.00"],
                      ["Maintenances", "$140.00"],
                      ["Total Cost of Ownership", "$2,639.00"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium">{val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border p-4 flex flex-col items-center gap-2">
                    <div className="h-32 w-32 rounded-xl border bg-muted/30" />
                    <span className="text-xs font-mono text-muted-foreground">#AST-0142</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Rail Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-lg border bg-muted/40" />
                ))}
              </div>
              <div className="aspect-[4/3] w-full rounded-xl border bg-muted/30" />
              <div className="rounded-xl border p-3.5 space-y-2">
                <p className="text-xs text-muted-foreground">Custodian</p>
                <p className="text-sm font-semibold">Available for assignment</p>
              </div>
              <div className="divide-y text-xs">
                {[
                  ["Model", "MacBook Pro 16"],
                  ["Category", "Laptops"],
                  ["Manufacturer", "Apple Inc."],
                  ["Supplier", "CDW Enterprise"],
                  ["Location", "San Francisco HQ"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2.5">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Skeleton>
  );
}
