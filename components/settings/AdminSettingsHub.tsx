"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Skeleton } from "skullet/react";
import { SampleTableRows } from "@/components/skeletons/AppSkeletons";
import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  CircleDot,
  Copyright,
  Database,
  Download,
  FileArchive,
  FolderTree,
  Globe,
  HardDrive,
  Home,
  KeyRound,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  MapPin,
  Network,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  Tags,
  Terminal,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RolePermissionsDialog } from "@/components/people/RolePermissionsDialog";
import { BulkActionBar } from "@/components/BulkActionBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import type { ExportColumnDef } from "@/lib/exportData";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";

type ModalKey =
  | null
  | "branding"
  | "general"
  | "security"
  | "localization"
  | "notifications"
  | "integrations"
  | "asset_tags"
  | "labels"
  | "backups"
  | "login_attempts"
  | "purge";

interface SettingsData {
  site_name: string;
  site_tagline?: string;
  site_logo?: string;
  default_currency: string;
  currency_code: string;
  locale: string;
  date_format: string;
  timezone: string;
  auto_increment_prefix: string;
  auto_increment_assets: boolean;
  auto_increment_padding: number;
  audit_interval_months: number;
  alert_threshold: number;
  alert_interval: number;
  show_alerts_in_menu: boolean;
  dash_chart_type: "name" | "type";
  default_eula_text: string;
  require_eula_acceptance: boolean;
  alert_email?: string;
  min_password_length: number;
  session_max_age_days: number;
  allow_self_registration: boolean;
  label_width_mm: number;
  label_height_mm: number;
  label_show_serial: boolean;
  label_show_model: boolean;
  label_show_company: boolean;
}

interface SystemInfoData {
  appVersion: string;
  framework: string;
  nodeVersion: string;
  authProvider: string;
  databaseDriver: string;
  databaseName: string;
  dbLatencyMs: number;
  mailProvider: string;
  searchEngine: string;
  timezone: string;
  workspaceId: string;
  adminEmail: string;
  authSecretConfigured: boolean;
}

interface LoginAttemptRow {
  _id: string;
  email: string;
  role?: string;
  action: "login" | "register";
  success: boolean;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

interface TileItem {
  id: string;
  title: string;
  subtitle: string;
  keywords: string;
  icon: React.ElementType;
  href?: string;
  modal?: ModalKey;
  danger?: boolean;
  badge?: string;
}

const TAXONOMY_CARDS = [
  {
    title: "Status Labels",
    subtitle: "Deployable, Pending, Archived & Requestable states",
    href: "/settings/status",
    icon: CircleDot,
  },
  {
    title: "Asset Models",
    subtitle: "Hardware specifications, model numbers & EOL tracking",
    href: "/settings/assetmodel",
    icon: Layers,
  },
  {
    title: "Categories",
    subtitle: "Asset, License, Accessory, Consumable & Component groups",
    href: "/settings/category",
    icon: FolderTree,
  },
  {
    title: "Manufacturers",
    subtitle: "Hardware vendors, support URLs & contacts",
    href: "/settings/manufacturer",
    icon: HardDrive,
  },
  {
    title: "Suppliers",
    subtitle: "Procurement vendors, billing & RMA contacts",
    href: "/settings/supplier",
    icon: Truck,
  },
  {
    title: "Departments",
    subtitle: "Cost centers & internal team divisions",
    href: "/settings/department",
    icon: Network,
  },
  {
    title: "Locations",
    subtitle: "Offices, warehouses & regional branches",
    href: "/settings/location",
    icon: MapPin,
  },
  {
    title: "Companies",
    subtitle: "Parent entities & multi-subsidiary ownership",
    href: "/settings/company",
    icon: Building2,
  },
];

export function AdminSettingsHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canAccessDevTools } = usePermissions();

  const [keyword, setKeyword] = useState("");
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [draft, setDraft] = useState<Partial<SettingsData>>({});
  const [saving, setSaving] = useState(false);
  const [syncingSearch, setSyncingSearch] = useState(false);
  const [seedingDevDemo, setSeedingDevDemo] = useState(false);
  const [purgingMode, setPurgingMode] = useState<string | null>(null);
  const [confirmPurgeMode, setConfirmPurgeMode] = useState<
    null | "purge_canceled_requests" | "purge_logs" | "reset_inventory"
  >(null);

  const { data, isLoading } = useQuery<{
    settings: SettingsData;
    systemInfo: SystemInfoData;
  }>({
    queryKey: ["admin-settings-general"],
    queryFn: async () => {
      const res = await axios.get("/api/settings/general");
      return res.data.data;
    },
  });

  const {
    data: loginAttempts = [],
    isLoading: loadingAttempts,
    refetch: refetchAttempts,
  } = useQuery<LoginAttemptRow[]>({
    queryKey: ["admin-login-attempts"],
    queryFn: async () => {
      const res = await axios.get("/api/settings/login-attempts");
      return res.data.data || [];
    },
    enabled: activeModal === "login_attempts",
  });

  const settings = data?.settings;
  const systemInfo = data?.systemInfo;

  const attemptBulk = useBulkSelection();
  const visibleAttemptIds = loginAttempts.map((r) => r._id);
  const selectedAttempts = loginAttempts.filter((r) => attemptBulk.isSelected(r._id));
  const loginAttemptExportCols: ExportColumnDef<LoginAttemptRow>[] = [
    { header: "Email", accessor: (r) => r.email },
    { header: "Event", accessor: (r) => r.action },
    { header: "Result", accessor: (r) => (r.success ? "Success" : "Failed") },
    { header: "Details", accessor: (r) => r.reason || "" },
    {
      header: "Time",
      accessor: (r) => (r.createdAt ? format(new Date(r.createdAt), "yyyy-MM-dd HH:mm") : ""),
    },
  ];

  const openModal = (key: ModalKey) => {
    if (settings) {
      setDraft({ ...settings });
    }
    setActiveModal(key);
  };

  const handleSaveSection = async (sectionName: string, fields: (keyof SettingsData)[]) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { _section: sectionName };
      for (const f of fields) {
        payload[f] = draft[f];
      }
      await axios.put("/api/settings/general", payload);
      await queryClient.invalidateQueries({ queryKey: ["admin-settings-general"] });
      toast({
        title: `${sectionName} Saved`,
        description: "Workspace configuration updated successfully.",
      });
      setActiveModal(null);
    } catch (err) {
      toast({
        title: "Save Failed",
        description: getClientErrorMessage(err, "Unable to save settings."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSearchSync = async () => {
    setSyncingSearch(true);
    try {
      const res = await axios.post("/api/search/sync");
      toast({
        title: "Search Index Synced",
        description: res.data?.message || "Search index refreshed cleanly.",
      });
    } catch (err) {
      toast({
        title: "Sync Failed",
        description: getClientErrorMessage(err, "Unable to rebuild search index."),
        variant: "destructive",
      });
    } finally {
      setSyncingSearch(false);
    }
  };

  const handleExecutePurge = async () => {
    if (!confirmPurgeMode) return;
    setPurgingMode(confirmPurgeMode);
    try {
      const res = await axios.post("/api/settings/purge", { mode: confirmPurgeMode });
      await queryClient.invalidateQueries();
      toast({
        title: "Cleanup Completed",
        description: res.data?.message || "Selected records were removed.",
      });
      setConfirmPurgeMode(null);
      setActiveModal(null);
    } catch (err) {
      toast({
        title: "Cleanup Failed",
        description: getClientErrorMessage(err, "Unable to purge records."),
        variant: "destructive",
      });
    } finally {
      setPurgingMode(null);
    }
  };

  const handleDevSeed = async () => {
    setSeedingDevDemo(true);
    try {
      const res = await axios.post("/api/demo/seed");
      await queryClient.invalidateQueries();
      toast({
        title: "Dummy Data Loaded",
        description:
          res.data?.message || "Sample inventory, people, and activity logs populated.",
      });
      setActiveModal(null);
    } catch (err) {
      toast({
        title: "Seed Failed",
        description: getClientErrorMessage(err, "Unable to seed dummy data."),
        variant: "destructive",
      });
    } finally {
      setSeedingDevDemo(false);
    }
  };

  const tiles: TileItem[] = useMemo(
    () => [
      {
        id: "branding",
        title: "Branding",
        subtitle: "Site Name, Tagline & Logo",
        keywords: "branding logo site name tagline theme",
        icon: Copyright,
        modal: "branding",
      },
      {
        id: "general",
        title: "General Settings",
        subtitle: "Default EULA, Audit Cycle & Charts",
        keywords: "general eula default acceptance audit dashboard chart",
        icon: SlidersHorizontal,
        modal: "general",
      },
      {
        id: "security",
        title: "Security & Sessions",
        subtitle: "Password Policy, Cookie Lifetime & Sign-up",
        keywords: "security password restrictions session timeout registration auth",
        icon: Lock,
        modal: "security",
      },
      {
        id: "roles",
        title: "Roles & Permissions",
        subtitle: "Admin, Assets User & Request User Access",
        keywords: "groups roles permissions rbac users access matrix",
        icon: Users,
        href: "/people?tab=roles",
      },
      {
        id: "localization",
        title: "Localization",
        subtitle: "Currency, Locale, Timezone & Date Display",
        keywords: "localization currency language timezone date format",
        icon: Globe,
        modal: "localization",
      },
      {
        id: "notifications",
        title: "Notifications",
        subtitle: "Alert Email, Thresholds & Audit Intervals",
        keywords: "notifications alerts email low stock audit threshold",
        icon: Bell,
        modal: "notifications",
      },
      {
        id: "integrations",
        title: "Integrations & Search",
        subtitle: "Resend Mail, Search Engine & Re-indexing",
        keywords: "integrations search elastic resend email webhook api",
        icon: KeyRound,
        modal: "integrations",
      },
      {
        id: "asset_tags",
        title: "Asset Tags",
        subtitle: "Auto-Incrementing & Prefix Rules",
        keywords: "asset tags incrementing prefix padding",
        icon: ListChecks,
        modal: "asset_tags",
      },
      {
        id: "labels",
        title: "Labels & Barcodes",
        subtitle: "Printable Asset Label Size & Fields",
        keywords: "labels barcodes serial model company print",
        icon: Tag,
        modal: "labels",
      },
      {
        id: "database_setup",
        title: "Database & Pre-Flight",
        subtitle: "MongoDB Cluster Switching & Health",
        keywords: "database mongodb setup connection preflight env",
        icon: Database,
        href: "/setup",
      },
      {
        id: "backups",
        title: "Backups & Export",
        subtitle: "Download Full Workspace JSON Archive",
        keywords: "backups restore export json download snapshot",
        icon: FileArchive,
        modal: "backups",
      },
      {
        id: "login_attempts",
        title: "Login Attempts",
        subtitle: "Audit of Recent Sign-Ins & Failed Logins",
        keywords: "login attempts security audit log sessions",
        icon: Activity,
        modal: "login_attempts",
      },
      {
        id: "purge",
        title: "Purge & Cleanup",
        subtitle: "Remove Logs, Canceled Items or Reset Data",
        keywords: "purge delete cleanup reset clear logs canceled",
        icon: Trash2,
        modal: "purge",
        danger: true,
      },
      ...(canAccessDevTools
        ? [
            {
              id: "dev_tools",
              title: "Developer Seed & Reset",
              subtitle: "Load Dummy Data & Full Dev DB Reset",
              keywords: "developer dev tools dummy seed reset mock demo data",
              icon: Terminal,
              href: "/dev-tools",
              badge: "DEV ONLY",
            } satisfies TileItem,
          ]
        : []),
    ],
    [canAccessDevTools]
  );

  const q = keyword.trim().toLowerCase();
  const filteredTiles = q
    ? tiles.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subtitle.toLowerCase().includes(q) ||
          t.keywords.toLowerCase().includes(q)
      )
    : tiles;

  const filteredTaxonomies = q
    ? TAXONOMY_CARDS.filter(
        (c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
      )
    : TAXONOMY_CARDS;

  const tagPreviewPrefix = (draft.auto_increment_prefix ?? settings?.auto_increment_prefix ?? "AST-").trim();
  const tagPreviewPad = Math.min(8, Math.max(2, Number(draft.auto_increment_padding ?? settings?.auto_increment_padding ?? 4)));
  const tagPreviewExample = `${tagPreviewPrefix}${"1".padStart(tagPreviewPad, "0")}`;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header & Keyword Filter (Snipe-IT style) */}
      <div className="border rounded-[2.5em] p-5 bg-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/50">
            <Settings className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              <Link href="/admin" className="inline-flex items-center gap-1 hover:text-foreground">
                <Home className="h-3 w-3" />
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Admin Settings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Admin Settings</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Filter by setting keyword..."
              className="pl-9 pr-8 h-9 text-xs"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <RolePermissionsDialog />
        </div>
      </div>

      {/* Main Settings Tiles Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            System &amp; Security Controls
          </h2>
          {isLoading && (
            <Skeleton loading label="Loading workspace configuration" className="rounded-md">
              <span className="text-xs text-muted-foreground">
                Loading workspace configuration...
              </span>
            </Skeleton>
          )}
        </div>

        {filteredTiles.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No settings matched &ldquo;{keyword}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {filteredTiles.map((tile) => {
              const Icon = tile.icon;
              const inner = (
                <div
                  className={`group h-full rounded-[1.5em] border bg-card p-6 flex flex-col items-center justify-center text-center gap-3 transition-all hover:bg-muted/40 ${
                    tile.danger
                      ? "border-destructive/40 hover:border-destructive/70"
                      : "hover:border-foreground/30"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105 ${
                      tile.danger
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "bg-muted/50 text-foreground"
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.9} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <p
                        className={`text-sm font-semibold ${
                          tile.danger ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {tile.title}
                      </p>
                      {tile.badge && (
                        <Badge variant="outline" className="text-[10px]">
                          {tile.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{tile.subtitle}</p>
                  </div>
                </div>
              );

              if (tile.href) {
                return (
                  <Link key={tile.id} href={tile.href} className="block h-full">
                    {inner}
                  </Link>
                );
              }

              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => openModal(tile.modal || null)}
                  className="block w-full h-full text-left"
                >
                  {inner}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* AssetsVista Directory & Catalog Taxonomies (Missing in Snipe-IT grid, tailored to our app) */}
      {filteredTaxonomies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Catalog &amp; Organization Directories
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredTaxonomies.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-2xl border bg-card p-4 flex items-start justify-between gap-3 hover:bg-muted/40 hover:border-foreground/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-muted/50">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{card.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* System Information Card (Snipe-IT style) */}
      <div className="rounded-[1.75em] border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">System Information</h2>
            <p className="text-xs text-muted-foreground">
              Active runtime, authentication provider, database health &amp; mail configuration
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-[11px]">
            {systemInfo?.appVersion || "v0.1.0"}
          </Badge>
        </div>

        <div className="p-4">
          <Skeleton
            id="admin-system-info"
            loading={isLoading || !systemInfo}
            label="Loading system information"
          >
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs font-medium text-muted-foreground w-48">
                      AssetsVista Version
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {systemInfo?.appVersion || "v0.1.0"}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground w-48">
                      Runtime Stack
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {systemInfo?.framework || "Next.js 16 (App Router)"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      Node.js Version
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {systemInfo?.nodeVersion || "v20.x"}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      Authentication
                    </TableCell>
                    <TableCell className="text-xs">
                      {systemInfo?.authProvider || "Session Cookie Auth"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      Timezone / Date Format
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {systemInfo?.timezone || "UTC"} · {settings?.date_format || "MMM d, yyyy"}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      Database Driver
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {systemInfo?.databaseDriver || "Mongoose"} ({systemInfo?.databaseName || "assetsvista"} ·{" "}
                      {systemInfo?.dbLatencyMs ?? 12}ms)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      Mail &amp; Alert Delivery
                    </TableCell>
                    <TableCell className="text-xs">
                      {systemInfo?.mailProvider || "Resend"}
                      {settings?.alert_email ? ` (${settings.alert_email})` : ""}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      Search Engine
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {systemInfo?.searchEngine || "Elastic Fuzzy Search"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      Workspace Scope ID
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {systemInfo?.workspaceId || "ws_default"}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      Active Admin Account
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {systemInfo?.adminEmail || "admin@company.com"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Skeleton>
        </div>
      </div>

      {/* 1. Branding Modal */}
      <Dialog open={activeModal === "branding"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Branding Settings</DialogTitle>
            <DialogDescription>
              Customize your organization&apos;s workspace title, tagline, and brand logo URL.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="set-site-name">Site / Organization Name</Label>
              <Input
                id="set-site-name"
                value={draft.site_name ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, site_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-tagline">Tagline</Label>
              <Input
                id="set-tagline"
                value={draft.site_tagline ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, site_tagline: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-logo">Custom Logo URL (Optional)</Label>
              <Input
                id="set-logo"
                placeholder="https://example.com/logo.png"
                value={draft.site_logo ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, site_logo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                handleSaveSection("Branding", ["site_name", "site_tagline", "site_logo"])
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Branding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. General & EULA Modal */}
      <Dialog open={activeModal === "general"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>General Settings &amp; Default EULA</DialogTitle>
            <DialogDescription>
              Configure hardware acceptance EULA copy, audit schedule defaults, and dashboard chart mode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="set-audit-months">Audit Interval (Months)</Label>
                <Input
                  id="set-audit-months"
                  type="number"
                  min={1}
                  value={draft.audit_interval_months ?? 12}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, audit_interval_months: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Default Status Chart Mode</Label>
                <Select
                  value={draft.dash_chart_type ?? "name"}
                  onValueChange={(v: "name" | "type") =>
                    setDraft((d) => ({ ...d, dash_chart_type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">By Status Name</SelectItem>
                    <SelectItem value="type">By Status Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 rounded-xl border bg-muted/30 p-3">
              <Checkbox
                id="set-req-eula"
                checked={Boolean(draft.require_eula_acceptance ?? true)}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({ ...d, require_eula_acceptance: Boolean(checked) }))
                }
              />
              <Label htmlFor="set-req-eula" className="text-xs font-normal cursor-pointer">
                Require user EULA acceptance when checking out assets
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="set-eula">Default EULA Acknowledgement Text</Label>
              <Textarea
                id="set-eula"
                rows={4}
                value={draft.default_eula_text ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, default_eula_text: e.target.value }))}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                handleSaveSection("General Settings", [
                  "audit_interval_months",
                  "dash_chart_type",
                  "require_eula_acceptance",
                  "default_eula_text",
                ])
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save General Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Security & Session Modal */}
      <Dialog open={activeModal === "security"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Security &amp; Session Restrictions</DialogTitle>
            <DialogDescription>
              Control minimum password complexity, session lifetime, and workspace registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="set-pw-len">Minimum Password Length</Label>
                <Input
                  id="set-pw-len"
                  type="number"
                  min={6}
                  max={32}
                  value={draft.min_password_length ?? 6}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, min_password_length: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-sess-days">Session Lifetime (Days)</Label>
                <Input
                  id="set-sess-days"
                  type="number"
                  min={1}
                  max={90}
                  value={draft.session_max_age_days ?? 7}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, session_max_age_days: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2.5 rounded-xl border bg-muted/30 p-3">
              <Checkbox
                id="set-self-reg"
                checked={Boolean(draft.allow_self_registration ?? true)}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({ ...d, allow_self_registration: Boolean(checked) }))
                }
              />
              <Label htmlFor="set-self-reg" className="text-xs font-normal cursor-pointer">
                Allow new independent workspace registrations on `/login`
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                handleSaveSection("Security Settings", [
                  "min_password_length",
                  "session_max_age_days",
                  "allow_self_registration",
                ])
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Security
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Localization Modal */}
      <Dialog open={activeModal === "localization"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Localization &amp; Regional Display</DialogTitle>
            <DialogDescription>
              Set default currency formatting, locale, date display pattern, and timezone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="set-curr-sym">Currency Symbol</Label>
                <Input
                  id="set-curr-sym"
                  value={draft.default_currency ?? "$"}
                  onChange={(e) => setDraft((d) => ({ ...d, default_currency: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-curr-code">Currency Code</Label>
                <Input
                  id="set-curr-code"
                  value={draft.currency_code ?? "USD"}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, currency_code: e.target.value.toUpperCase() }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="set-locale">Locale</Label>
                <Input
                  id="set-locale"
                  value={draft.locale ?? "en-US"}
                  onChange={(e) => setDraft((d) => ({ ...d, locale: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date Format</Label>
                <Select
                  value={draft.date_format ?? "MMM d, yyyy"}
                  onValueChange={(v) => setDraft((d) => ({ ...d, date_format: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MMM d, yyyy">MMM d, yyyy</SelectItem>
                    <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                    <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                    <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="set-tz">Default Timezone</Label>
              <Input
                id="set-tz"
                value={draft.timezone ?? "UTC"}
                onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}
                placeholder="UTC, America/New_York, Asia/Kolkata..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                handleSaveSection("Localization", [
                  "default_currency",
                  "currency_code",
                  "locale",
                  "date_format",
                  "timezone",
                ])
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Localization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Notifications Modal */}
      <Dialog
        open={activeModal === "notifications"}
        onOpenChange={(o) => !o && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Notifications &amp; Low-Inventory Alerts</DialogTitle>
            <DialogDescription>
              Configure low-inventory thresholds, reminder cadence, and alert email recipients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="set-alert-email">Alert Recipient Email</Label>
              <Input
                id="set-alert-email"
                type="email"
                value={draft.alert_email ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, alert_email: e.target.value }))}
                placeholder="it-alerts@company.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="set-alert-thresh">Global Low-Stock Threshold</Label>
                <Input
                  id="set-alert-thresh"
                  type="number"
                  min={0}
                  value={draft.alert_threshold ?? 0}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, alert_threshold: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-alert-int">Checkin / Expiring Window (Days)</Label>
                <Input
                  id="set-alert-int"
                  type="number"
                  min={1}
                  value={draft.alert_interval ?? 30}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, alert_interval: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2.5 rounded-xl border bg-muted/30 p-3">
              <Checkbox
                id="set-show-alerts"
                checked={Boolean(draft.show_alerts_in_menu ?? true)}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({ ...d, show_alerts_in_menu: Boolean(checked) }))
                }
              />
              <Label htmlFor="set-show-alerts" className="text-xs font-normal cursor-pointer">
                Show overdue &amp; expiring alerts bell badge in top navigation bar
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                handleSaveSection("Notifications", [
                  "alert_email",
                  "alert_threshold",
                  "alert_interval",
                  "show_alerts_in_menu",
                ])
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Notifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Integrations & Search Modal */}
      <Dialog
        open={activeModal === "integrations"}
        onOpenChange={(o) => !o && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Integrations &amp; Search Engine</DialogTitle>
            <DialogDescription>
              Inspect connected services and rebuild the full-text workspace search index.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="rounded-xl border p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Email Delivery (Resend API)</p>
                <p className="text-muted-foreground">{systemInfo?.mailProvider}</p>
              </div>
              <Badge variant={systemInfo?.mailProvider.includes("Not") ? "outline" : "secondary"}>
                {systemInfo?.mailProvider.includes("Not") ? "Optional" : "Connected"}
              </Badge>
            </div>

            <div className="rounded-xl border p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Global Search Engine</p>
                <p className="text-muted-foreground">{systemInfo?.searchEngine}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSearchSync}
                disabled={syncingSearch}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncingSearch ? "animate-spin" : ""}`} />
                Re-sync Index
              </Button>
            </div>

            <div className="rounded-xl border p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">MongoDB Database Cluster</p>
                <p className="text-muted-foreground">
                  {systemInfo?.databaseName} ({systemInfo?.dbLatencyMs}ms ping)
                </p>
              </div>
              <Link href="/setup">
                <Button variant="outline" size="sm">
                  Configure DB
                </Button>
              </Link>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setActiveModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Asset Tags Modal */}
      <Dialog open={activeModal === "asset_tags"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Asset Tags &amp; Auto-Incrementing</DialogTitle>
            <DialogDescription>
              Configure default tag prefixes and zero-padding for generated asset tags.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5 rounded-xl border bg-muted/30 p-3">
              <Checkbox
                id="set-auto-inc"
                checked={Boolean(draft.auto_increment_assets ?? true)}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({ ...d, auto_increment_assets: Boolean(checked) }))
                }
              />
              <Label htmlFor="set-auto-inc" className="text-xs font-normal cursor-pointer">
                Auto-increment asset tags when creating new hardware
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="set-prefix">Asset Tag Prefix</Label>
                <Input
                  id="set-prefix"
                  value={draft.auto_increment_prefix ?? "AST-"}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, auto_increment_prefix: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-pad">Zero Padding Digits</Label>
                <Input
                  id="set-pad"
                  type="number"
                  min={2}
                  max={8}
                  value={draft.auto_increment_padding ?? 4}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, auto_increment_padding: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Live Tag Preview:</span>
              <Badge variant="outline" className="font-mono text-sm">
                {tagPreviewExample}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                handleSaveSection("Asset Tags", [
                  "auto_increment_assets",
                  "auto_increment_prefix",
                  "auto_increment_padding",
                ])
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Asset Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Labels Modal */}
      <Dialog open={activeModal === "labels"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Asset Labels &amp; Barcode Settings</DialogTitle>
            <DialogDescription>
              Customize printable asset sticker dimensions and visible hardware metadata fields.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="set-lw">Label Width (mm)</Label>
                <Input
                  id="set-lw"
                  type="number"
                  min={20}
                  max={200}
                  value={draft.label_width_mm ?? 62}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, label_width_mm: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-lh">Label Height (mm)</Label>
                <Input
                  id="set-lh"
                  type="number"
                  min={15}
                  max={150}
                  value={draft.label_height_mm ?? 29}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, label_height_mm: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border p-3.5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lbl-company"
                  checked={Boolean(draft.label_show_company ?? true)}
                  onCheckedChange={(c) =>
                    setDraft((d) => ({ ...d, label_show_company: Boolean(c) }))
                  }
                />
                <Label htmlFor="lbl-company" className="text-xs font-normal cursor-pointer">
                  Print Organization / Company header
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lbl-model"
                  checked={Boolean(draft.label_show_model ?? true)}
                  onCheckedChange={(c) =>
                    setDraft((d) => ({ ...d, label_show_model: Boolean(c) }))
                  }
                />
                <Label htmlFor="lbl-model" className="text-xs font-normal cursor-pointer">
                  Print Asset Model name
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lbl-serial"
                  checked={Boolean(draft.label_show_serial ?? true)}
                  onCheckedChange={(c) =>
                    setDraft((d) => ({ ...d, label_show_serial: Boolean(c) }))
                  }
                />
                <Label htmlFor="lbl-serial" className="text-xs font-normal cursor-pointer">
                  Print Hardware Serial Number
                </Label>
              </div>
            </div>

            <div className="rounded-xl border border-dashed bg-muted/30 p-3 space-y-1 font-mono text-[11px]">
              {(draft.label_show_company ?? true) && (
                <p className="font-bold uppercase tracking-wider text-foreground">
                  {draft.site_name || settings?.site_name || "AssetsVista"}
                </p>
              )}
              <p className="text-sm font-bold">{tagPreviewExample}</p>
              {(draft.label_show_model ?? true) && (
                <p className="text-muted-foreground">Model: MacBook Pro 14&quot;</p>
              )}
              {(draft.label_show_serial ?? true) && (
                <p className="text-muted-foreground">S/N: SN-EXAMPLE-9012</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                handleSaveSection("Labels Settings", [
                  "label_width_mm",
                  "label_height_mm",
                  "label_show_company",
                  "label_show_model",
                  "label_show_serial",
                ])
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Labels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Backups & Export Modal */}
      <Dialog open={activeModal === "backups"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Backups &amp; Workspace Export</DialogTitle>
            <DialogDescription>
              Download a full JSON archive containing your workspace inventory, people directory,
              taxonomies, requests, and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">Included Collections</p>
            <p>
              Assets, Licenses, Accessories, Consumables, Components, People, Maintenances,
              Requests, Acceptances, Taxonomies, Settings &amp; Recent Activity Logs.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Close
            </Button>
            <a href="/api/settings/backup" download>
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                Download Backup JSON
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 10. Login Attempts Audit Modal */}
      <Dialog
        open={activeModal === "login_attempts"}
        onOpenChange={(o) => !o && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Workspace Login Attempts</DialogTitle>
            <DialogDescription>
              Recent authentication and registration events recorded for your organization workspace.
            </DialogDescription>
          </DialogHeader>
          <BulkActionBar
            selectedCount={selectedAttempts.length}
            entityLabel="login event"
            onClearSelection={attemptBulk.clear}
            exportConfig={{
              filename: "login_attempts_selected",
              sheetName: "Login Attempts",
              data: selectedAttempts,
              columns: loginAttemptExportCols,
            }}
            actions={[]}
          />
          <div className="border rounded-xl overflow-hidden max-h-[55vh] overflow-y-auto">
            <Skeleton
              id="admin-login-attempts"
              loading={loadingAttempts}
              label="Loading login attempts"
              empty={!loadingAttempts && loginAttempts.length === 0}
              emptyMessage={
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={false} disabled aria-label="Select all login events" />
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        No login events recorded yet.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={attemptBulk.headerCheckState(visibleAttemptIds)}
                        onCheckedChange={(checked) =>
                          attemptBulk.toggleAll(visibleAttemptIds, !!checked)
                        }
                        aria-label="Select all login events"
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAttempts ? (
                    <SampleTableRows
                      columns={["checkbox", "text", "text", "badge", "text", "date"]}
                      rowCount={5}
                    />
                  ) : (
                    loginAttempts.map((row) => (
                      <TableRow key={row._id}>
                        <TableCell>
                          <Checkbox
                            checked={attemptBulk.isSelected(row._id)}
                            onCheckedChange={(checked) =>
                              attemptBulk.toggleOne(row._id, !!checked)
                            }
                            aria-label={`Select login event ${row.email}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs font-mono">{row.email}</TableCell>
                        <TableCell className="text-xs capitalize">{row.action}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={row.success ? "secondary" : "destructive"}>
                            {row.success ? "Success" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {row.reason || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground whitespace-nowrap">
                          {row.createdAt ? format(new Date(row.createdAt), "MMM d, HH:mm") : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Skeleton>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => refetchAttempts()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button onClick={() => setActiveModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 11. Purge & Workspace Cleanup Modal */}
      <Dialog open={activeModal === "purge"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Purge &amp; Workspace Cleanup
            </DialogTitle>
            <DialogDescription>
              Permanently remove historical or canceled records from this workspace. Actions apply
              only to your workspace and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Purge Canceled Requests &amp; Declined Items</p>
                <p className="text-xs text-muted-foreground">
                  Deletes canceled item requests and declined EULA acceptance rows.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmPurgeMode("purge_canceled_requests")}
              >
                Purge
              </Button>
            </div>

            <div className="rounded-xl border p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Clear Activity &amp; Login Audit Logs</p>
                <p className="text-xs text-muted-foreground">
                  Removes workspace action history and login attempt logs.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmPurgeMode("purge_logs")}
              >
                Clear Logs
              </Button>
            </div>

            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-destructive">Reset Workspace Inventory</p>
                <p className="text-xs text-muted-foreground">
                  Clears all Assets, Licenses, Accessories, Consumables, Components &amp;
                  Maintenances while keeping Users, Roles, Taxonomies &amp; Settings.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmPurgeMode("reset_inventory")}
              >
                Reset
              </Button>
            </div>

            {canAccessDevTools && (
              <div className="rounded-xl border p-3.5 flex items-center justify-between gap-3 bg-muted/30">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">Load Dummy Data</p>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      DEV ONLY
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Repopulates sample inventory, people, taxonomies, and logs (hidden in production
                    and from normal users).
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href="/dev-tools" onClick={() => setActiveModal(null)}>
                    <Button variant="outline" size="sm">
                      Console
                    </Button>
                  </Link>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleDevSeed}
                    disabled={seedingDevDemo}
                  >
                    {seedingDevDemo ? "Seeding..." : "Load Dummy Data"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Confirmation Alert */}
      <AlertDialog
        open={Boolean(confirmPurgeMode)}
        onOpenChange={(o) => !o && setConfirmPurgeMode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Permanent Deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently deletes the selected workspace records and cannot be undone.
              Download a JSON backup from Backups &amp; Export first if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(purgingMode)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecutePurge}
              disabled={Boolean(purgingMode)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {purgingMode ? "Working..." : "Yes, Permanently Purge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

