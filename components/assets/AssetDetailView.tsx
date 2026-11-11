"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Edit,
  ExternalLink,
  Factory,
  FileSignature,
  History,
  Info,
  Laptop,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Maximize2,
  Package,
  Pencil,
  Phone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Truck,
  User,
  Users,
  Wrench,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExportButton } from "@/components/ExportButton";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import AssetCheckinDialog from "@/components/forms/Assets/AssetCheckinDialog";
import AssetCheckoutDialog from "@/components/forms/Assets/AssetCheckoutDialog";
import AssetEditForm from "@/components/forms/Assets/AssetsEditForm";
import { AssetDetailSkeleton } from "@/components/skeletons/AppSkeletons";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";
import type { ExportColumnDef } from "@/lib/exportData";
import { AssetLifecycleChart } from "./AssetLifecycleChart";
import { AssetAuditDialog, AssetQuickMaintenanceDialog } from "./AssetModals";
import { AssetQrTagCard } from "./AssetQrTagCard";

type DetailTab = "details" | "maintenances" | "acceptances" | "requests" | "history";
type HistoryFilter = "all" | "custody" | "audit" | "maintenance" | "updates";

function formatMoney(amount: number | undefined | null, symbol = "$"): string {
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso?: string | Date | null, fallback = "N/A"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return format(d, "MMM d, yyyy");
}

function formatDateTime(iso?: string | Date | null, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return format(d, "MMM d, yyyy · h:mm a");
}

function formatAssigneeName(assigned: any, assignedType?: string | null): string {
  if (!assigned) return "";
  if (assignedType === "Asset") {
    return assigned.asset_tag
      ? `#${assigned.asset_tag}${assigned.asset_name ? ` - ${assigned.asset_name}` : ""}`
      : assigned.asset_name || "Asset";
  }
  if (assigned.first_name || assigned.last_name) {
    return `${assigned.first_name || ""} ${assigned.last_name || ""}`.trim();
  }
  return assigned.name || assigned.username || "Assigned";
}

function getStatusBadgeClasses(statusType?: string): string {
  switch (statusType) {
    case "deployable":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "undeployable":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "archived":
      return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30";
    default:
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: "Copy failed", description: "Clipboard permission denied.", variant: "destructive" });
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${label}`}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function AssetDetailView({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { permissions } = usePermissions();

  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [maintBusyId, setMaintBusyId] = useState<string | null>(null);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const {
    data: asset,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["asset", id, "details"],
    queryFn: async () => {
      const res = await axios.get(`/api/core/asset/${id}?details=1`);
      return res.data.data;
    },
  });

  const details = asset?.details;
  const metrics = details?.metrics;
  const settings = details?.settings;
  const currency = settings?.default_currency || "$";

  const maintenances: any[] = useMemo(() => details?.maintenances || [], [details]);
  const activityLogs: any[] = useMemo(() => details?.activityLogs || [], [details]);
  const acceptances: any[] = useMemo(() => details?.acceptances || [], [details]);
  const requests: any[] = useMemo(() => details?.requests || [], [details]);

  const filteredLogs = useMemo(() => {
    if (historyFilter === "all") return activityLogs;
    return activityLogs.filter((log) => {
      const action = log.action_type;
      if (historyFilter === "custody") {
        return ["checkout", "checkin", "accepted", "declined", "requested"].includes(action);
      }
      if (historyFilter === "audit") return action === "audit";
      if (historyFilter === "maintenance") return action === "maintenance";
      return ["create", "update", "delete"].includes(action);
    });
  }, [activityLogs, historyFilter]);

  const historyExportColumns: ExportColumnDef<any>[] = useMemo(
    () => [
      {
        header: "Timestamp",
        accessor: (log) =>
          log.createdAt ? new Date(log.createdAt).toLocaleString() : "",
      },
      { header: "Action", accessor: (log) => log.action_type || "-" },
      { header: "Actor", accessor: (log) => log.admin_name || "Admin" },
      { header: "Target", accessor: (log) => log.target_name || "-" },
      { header: "Notes", accessor: (log) => log.notes || "" },
    ],
    []
  );

  if (isLoading) {
    return <AssetDetailSkeleton />;
  }

  if (error || !asset) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
          <Laptop className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Asset Not Found</h2>
          <p className="text-sm text-muted-foreground">
            Could not load this asset record or it may have been removed from the workspace.
          </p>
        </div>
        <Link href="/assets/listall">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Assets
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = asset.asset_name || asset.asset_model?.name || asset.asset_tag;
  const heroImage = asset.image || asset.asset_model?.image || "";
  const isCustomPhoto = Boolean(asset.image);
  const isAssigned = Boolean(asset.assigned_to);
  const assignedName = formatAssigneeName(asset.assigned_to, asset.assigned_type);
  const statusType = asset.status?.type || "deployable";
  const statusLabel = asset.status?.name || "Unknown Status";

  const latestAcceptance = acceptances[0];
  const dep = metrics?.depreciation;
  const eol = metrics?.eol;
  const warranty = metrics?.warranty;
  const tco = metrics?.tco;
  const auditInfo = metrics?.audit;
  const counts = metrics?.counts;

  const handleDeleteAsset = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`/api/core/asset?id=${id}`);
      toast({
        title: "Moved to Deleted Trash",
        description: `#${asset.asset_tag} can be restored from Assets > Deleted.`,
        variant: "destructive",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assets"] }),
        queryClient.invalidateQueries({ queryKey: ["deleted-assets"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
        queryClient.invalidateQueries({ queryKey: ["status"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["needs-attention"] }),
      ]);
      router.replace("/assets/listall");
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: getClientErrorMessage(err, "Failed to delete asset."),
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await axios.put(`/api/core/asset/${id}`, { notes: notesDraft });
      toast({ title: "Notes Saved", description: "Asset notes updated." });
      setEditingNotes(false);
      await queryClient.invalidateQueries({ queryKey: ["asset", id] });
    } catch (err) {
      toast({
        title: "Save Failed",
        description: getClientErrorMessage(err, "Unable to update notes."),
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleMaintenanceAction = async (
    maintenanceId: string,
    action: "complete" | "reopen" | "delete"
  ) => {
    setMaintBusyId(maintenanceId);
    try {
      if (action === "delete") {
        await axios.delete(`/api/core/maintenance?id=${maintenanceId}`);
        toast({ title: "Maintenance Deleted", description: "Maintenance record removed." });
      } else {
        await axios.patch("/api/core/maintenance", { id: maintenanceId, action });
        toast({
          title: action === "complete" ? "Maintenance Completed" : "Maintenance Reopened",
          description: "Service status updated.",
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["asset", id] }),
        queryClient.invalidateQueries({ queryKey: ["maintenances"] }),
        queryClient.invalidateQueries({ queryKey: ["needs-attention"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar-events"] }),
        queryClient.invalidateQueries({ queryKey: ["reports-maintenance"] }),
      ]);
    } catch (err) {
      toast({
        title: "Action Failed",
        description: getClientErrorMessage(err, "Could not update maintenance record."),
        variant: "destructive",
      });
    } finally {
      setMaintBusyId(null);
    }
  };

  const assigneeHref =
    asset.assigned_type === "People" && asset.assigned_to?._id
      ? `/people/${asset.assigned_to._id}`
      : asset.assigned_type === "Asset" && asset.assigned_to?._id
      ? `/assets/view/${asset.assigned_to._id}`
      : null;

  const tabItems: Array<{
    key: DetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { key: "details", label: "Details", icon: Info },
    {
      key: "maintenances",
      label: "Maintenances",
      icon: Wrench,
      count: counts?.totalMaintenances ?? maintenances.length,
    },
    {
      key: "acceptances",
      label: "Acceptances",
      icon: FileSignature,
      count: counts?.totalAcceptances ?? acceptances.length,
    },
    {
      key: "requests",
      label: "Requests",
      icon: ClipboardList,
      count: counts?.totalRequests ?? requests.length,
    },
    {
      key: "history",
      label: "History",
      icon: History,
      count: counts?.activityCount ?? activityLogs.length,
    },
  ];

  const activeTabLabel = tabItems.find((t) => t.key === activeTab)?.label || "Details";

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
      {/* Breadcrumb Strip */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/assets/listall" className="hover:text-foreground transition-colors font-medium">
          Assets
        </Link>
        <span>/</span>
        <span className="font-mono font-semibold text-foreground uppercase">#{asset.asset_tag}</span>
        <span>-</span>
        <span className="truncate max-w-[260px] text-foreground">{displayName}</span>
        <span>/</span>
        <span className="text-foreground font-medium">{activeTabLabel}</span>
      </nav>

      {/* Top Hero Identity Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[1.75em] p-5 bg-card">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/assets/listall">
            <Button size="icon" variant="ghost" className="rounded-full shrink-0" aria-label="Back to all assets">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <ImageThumbnail
            src={heroImage}
            alt={displayName}
            fallback="asset"
            size="lg"
            className="h-14 w-14 rounded-xl"
          />

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold uppercase">
                <span>#{asset.asset_tag}</span>
                <CopyButton value={asset.asset_tag} label="Asset Tag" />
              </div>

              <Badge variant="outline" className={getStatusBadgeClasses(statusType)}>
                {statusLabel}
              </Badge>

              {isAssigned ? (
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50"
                >
                  Checked out · {assignedName}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-dashed text-muted-foreground">
                  Unassigned
                </Badge>
              )}

              {auditInfo?.isAuditOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  Audit Overdue
                </Badge>
              )}
              {auditInfo?.isCheckinOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Overdue Checkin
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight truncate">{displayName}</h1>

            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {asset.manufacturer?.name && <span>{asset.manufacturer.name}</span>}
              {asset.asset_model?.name && (
                <>
                  <span>•</span>
                  <span>
                    {asset.asset_model.name}
                    {asset.asset_model.model_no ? ` (${asset.asset_model.model_no})` : ""}
                  </span>
                </>
              )}
              {asset.serial_number && (
                <>
                  <span>•</span>
                  <span className="font-mono">S/N: {asset.serial_number}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Primary Role-Aware Action Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {permissions.canCheckoutCheckin &&
            (isAssigned ? (
              <AssetCheckinDialog
                assetId={id}
                assetTag={asset.asset_tag}
                assetName={displayName}
                assignedToName={assignedName}
                trigger={
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <LogIn className="h-4 w-4" />
                    Check In Asset
                  </Button>
                }
              />
            ) : (
              <AssetCheckoutDialog
                assetId={id}
                assetTag={asset.asset_tag}
                assetName={displayName}
                trigger={
                  <Button size="sm" className="gap-1.5">
                    <LogOut className="h-4 w-4" />
                    Check Out Asset
                  </Button>
                }
              />
            ))}

          {!permissions.canCheckoutCheckin && (
            <Link href={`/requests?create=1&itemType=Asset&itemId=${id}`}>
              <Button size="sm" className="gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Request This Asset
              </Button>
            </Link>
          )}

          {permissions.canAuditAssets && (
            <AssetAuditDialog
              assetId={id}
              assetTag={asset.asset_tag}
              currentLocationId={asset.location?._id}
            />
          )}

          {permissions.canManageMaintenances && (
            <AssetQuickMaintenanceDialog assetId={id} assetTag={asset.asset_tag} />
          )}

          {permissions.canCreateEditAssets && (
            <AssetEditForm
              id={id}
              trigger={
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" />
                  Edit Asset
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Asymmetric 2-Column Workspace Split */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Left Main Content Workspace */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          {/* Tab Strip */}
          <div className="flex items-center gap-1 border-b px-4 pt-3 overflow-x-auto bg-muted/15">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "ghost"}
                  className="rounded-b-none gap-1.5 shrink-0"
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="ml-0.5 h-5 px-1.5 text-[10px] font-mono"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Tab 1: Details */}
          {activeTab === "details" && (
            <div className="p-5 space-y-6">
              {/* Top 3 Summary Boxes (Reference Layout) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Status &amp; Verification
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={getStatusBadgeClasses(statusType)}>
                      {statusLabel}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                      {statusType}
                    </Badge>
                  </div>
                  {latestAcceptance && (
                    <p className="text-[11px] text-muted-foreground">
                      EULA:{" "}
                      <span className="font-medium text-foreground capitalize">
                        {latestAcceptance.status}
                      </span>
                    </p>
                  )}
                </div>

                <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Last Checkout &amp; Custody
                  </p>
                  {isAssigned ? (
                    <>
                      {assigneeHref ? (
                        <Link
                          href={assigneeHref}
                          className="text-sm font-semibold hover:underline text-blue-600 dark:text-blue-400 block truncate"
                        >
                          {assignedName}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold truncate">{assignedName}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {asset.checkout_date
                          ? `${formatDate(asset.checkout_date)} (${formatDistanceToNow(
                              new Date(asset.checkout_date),
                              { addSuffix: true }
                            )})`
                          : "Checked out"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">Available in Pool</p>
                      <p className="text-[11px] text-muted-foreground">
                        Last checkout:{" "}
                        {asset.checkout_date ? formatDate(asset.checkout_date) : "N/A"}
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-xl border bg-muted/20 p-3.5 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Expected Checkin &amp; Audit
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      auditInfo?.isCheckinOverdue ? "text-rose-600 dark:text-rose-400" : ""
                    }`}
                  >
                    {asset.expected_checkin_date
                      ? formatDate(asset.expected_checkin_date)
                      : "No return scheduled"}
                  </p>
                  <p
                    className={`text-[11px] ${
                      auditInfo?.isAuditOverdue
                        ? "text-rose-600 dark:text-rose-400 font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    Next audit:{" "}
                    {auditInfo?.nextAuditDate ? formatDate(auditInfo.nextAuditDate) : "Not scheduled"}
                  </p>
                </div>
              </div>

              {/* Inner 2-Column Split: Specifications Left + Lifecycle/Costs/QR Right */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-6 items-start">
                {/* Left Column: Specification Dossier & Inline Notes */}
                <div className="space-y-4">
                  <div className="rounded-xl border overflow-hidden">
                    <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                      <span className="text-xs font-semibold">Hardware &amp; Lifecycle Specifications</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {settings?.currency_code || "USD"}
                      </span>
                    </div>
                    <div className="divide-y text-sm">
                      <SpecRow label="Asset Tag">
                        <div className="flex items-center gap-1.5 font-mono font-semibold uppercase">
                          <span>{asset.asset_tag}</span>
                          <CopyButton value={asset.asset_tag} label="Asset Tag" />
                        </div>
                      </SpecRow>

                      <SpecRow label="Asset Name">
                        <span className="font-medium">{asset.asset_name || "N/A"}</span>
                      </SpecRow>

                      <SpecRow label="Serial Number">
                        {asset.serial_number ? (
                          <div className="flex items-center gap-1.5 font-mono uppercase">
                            <span>{asset.serial_number}</span>
                            <CopyButton value={asset.serial_number} label="Serial Number" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No value</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Current Value">
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(dep?.currentValue, currency)}
                        </span>
                      </SpecRow>

                      <SpecRow label="Purchase Cost">
                        <span className="font-mono font-medium">
                          {formatMoney(asset.purchase_cost, currency)}
                        </span>
                      </SpecRow>

                      <SpecRow label="Last Audit Date">
                        {auditInfo?.lastAuditDate ? (
                          <span>
                            {formatDate(auditInfo.lastAuditDate)}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({formatDistanceToNow(new Date(auditInfo.lastAuditDate), { addSuffix: true })})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Never audited</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Next Audit Date">
                        {auditInfo?.nextAuditDate ? (
                          <span
                            className={
                              auditInfo.isAuditOverdue
                                ? "text-rose-600 dark:text-rose-400 font-medium"
                                : ""
                            }
                          >
                            {formatDate(auditInfo.nextAuditDate)}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({formatDistanceToNow(new Date(auditInfo.nextAuditDate), { addSuffix: true })})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Not scheduled</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Assigned To">
                        {isAssigned ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {assigneeHref ? (
                              <Link
                                href={assigneeHref}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {assignedName}
                              </Link>
                            ) : (
                              <span className="font-medium">{assignedName}</span>
                            )}
                            {asset.assigned_type && (
                              <Badge variant="outline" className="text-[10px]">
                                {asset.assigned_type}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Default Location">
                        {asset.location?.name ? (
                          <Link
                            href={`/assets/listall?search=${encodeURIComponent(asset.location.name)}`}
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{asset.location.name}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">No value</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Company">
                        {asset.company?.name ? (
                          <Link
                            href={`/assets/listall?search=${encodeURIComponent(asset.company.name)}`}
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span>{asset.company.name}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">No value</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Department">
                        {asset.department?.name ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{asset.department.name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">No value</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Model &amp; Category">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{asset.asset_model?.name || "N/A"}</span>
                          {asset.asset_model?.model_no && (
                            <span className="font-mono text-xs text-muted-foreground">
                              #{asset.asset_model.model_no}
                            </span>
                          )}
                          {asset.asset_model?.category?.name && (
                            <Badge variant="outline" className="text-[10px]">
                              {asset.asset_model.category.name}
                            </Badge>
                          )}
                        </div>
                      </SpecRow>

                      <SpecRow label="Order Number">
                        {asset.order_number ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span>{asset.order_number}</span>
                            <CopyButton value={asset.order_number} label="Order Number" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No value</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Purchase Date">
                        {asset.purchase_date ? (
                          <span>
                            {formatDate(asset.purchase_date)}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({formatDistanceToNow(new Date(asset.purchase_date), { addSuffix: true })})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">No value</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Warranty">
                        {warranty?.warrantyMonths > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{warranty.warrantyMonths} months</span>
                            <Badge
                              variant="outline"
                              className={
                                warranty.isWarrantyActive
                                  ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px]"
                                  : "border-zinc-500/30 text-muted-foreground text-[10px]"
                              }
                            >
                              {warranty.isWarrantyActive
                                ? `Active until ${formatDate(warranty.warrantyExpiryDate)}`
                                : `Expired ${formatDate(warranty.warrantyExpiryDate)}`}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">0 months</span>
                        )}
                      </SpecRow>

                      <SpecRow label="Device EOL">
                        {eol?.eolDate ? (
                          <span
                            className={
                              eol.isPastEol ? "text-rose-600 dark:text-rose-400 font-medium" : ""
                            }
                          >
                            {formatDate(eol.eolDate)}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({formatDistanceToNow(new Date(eol.eolDate), { addSuffix: true })})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Not specified</span>
                        )}
                      </SpecRow>
                    </div>
                  </div>

                  {/* Inline Notes Card */}
                  <div className="rounded-xl border p-4 space-y-2.5 bg-muted/15">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Asset Notes</span>
                      {permissions.canCreateEditAssets && !editingNotes && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => {
                            setNotesDraft(asset.notes || "");
                            setEditingNotes(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit Notes
                        </Button>
                      )}
                    </div>

                    {editingNotes ? (
                      <div className="space-y-2">
                        <Textarea
                          rows={3}
                          placeholder="Add hardware configuration, Condition details, or deployment notes..."
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingNotes(false)}
                            disabled={savingNotes}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveNotes}
                            disabled={savingNotes}
                          >
                            {savingNotes && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                        {asset.notes?.trim() || (
                          <span className="text-muted-foreground italic">
                            No notes recorded for this asset yet.
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column inside Details: Progress Bars + TCO + Telemetry + QR */}
                <div className="space-y-4">
                  {/* EOL & Depreciation Progress Bars + Chart */}
                  <div className="rounded-xl border p-4 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">Device EOL</span>
                        <span className="font-mono text-muted-foreground">
                          {eol?.eolDate
                            ? `${eol.monthsElapsed}/${eol.totalMonths} mos · ${eol.eolPercent}%`
                            : "No EOL set"}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            eol?.isPastEol
                              ? "bg-rose-500"
                              : (eol?.eolPercent || 0) >= 80
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${eol?.eolDate ? eol.eolPercent : 0}%` }}
                        />
                      </div>
                      {eol?.eolDate && (
                        <p className="text-[11px] text-muted-foreground flex justify-between">
                          <span>{formatDate(eol.eolDate)}</span>
                          <span>
                            {eol.isPastEol
                              ? `Past EOL by ${Math.abs(eol.eolDaysRemaining || 0)}d`
                              : `${eol.eolDaysRemaining ?? 0}d remaining`}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">Depreciation</span>
                        <span className="font-mono text-muted-foreground">
                          {dep?.percentDepreciated ?? 0}% ·{" "}
                          {formatDate(dep?.fullyDepreciatedDate)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            (dep?.percentDepreciated || 0) >= 100
                              ? "bg-rose-500"
                              : (dep?.percentDepreciated || 0) >= 70
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${dep?.percentDepreciated ?? 0}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground flex justify-between">
                        <span>Monthly: {formatMoney(dep?.monthlyDepreciation, currency)}</span>
                        <span>Book value: {formatMoney(dep?.currentValue, currency)}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t">
                      <AssetLifecycleChart
                        purchaseCost={dep?.purchaseCost || 0}
                        usefulLifeMonths={dep?.usefulLifeMonths || 36}
                        monthsElapsed={dep?.monthsElapsed || 0}
                        currencySymbol={currency}
                      />
                    </div>
                  </div>

                  {/* TCO Breakdown Card */}
                  <div className="rounded-xl border overflow-hidden">
                    <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                      <span className="text-xs font-semibold">Total Cost of Ownership</span>
                      <span className="text-[11px] text-muted-foreground">TCO</span>
                    </div>
                    <div className="divide-y text-sm">
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-muted-foreground">Purchase Cost</span>
                        <span className="font-mono font-medium">
                          {formatMoney(tco?.purchaseCost, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Wrench className="h-3.5 w-3.5" />
                          Maintenances ({counts?.totalMaintenances ?? 0})
                        </span>
                        <span className="font-mono font-medium">
                          {formatMoney(tco?.maintenanceCostTotal, currency)}
                        </span>
                      </div>
                      {(tco?.warrantyMaintenanceCost || 0) > 0 && (
                        <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground bg-muted/15">
                          <span>Warranty-covered portion</span>
                          <span className="font-mono">
                            {formatMoney(tco?.warrantyMaintenanceCost, currency)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/25 font-semibold">
                        <span>Total Ownership Cost</span>
                        <span className="font-mono text-base">
                          {formatMoney(tco?.totalCostOfOwnership, currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Counters Card */}
                  <div className="rounded-xl border p-3.5 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("maintenances")}
                      className="rounded-lg border bg-muted/20 p-2.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-[11px] text-muted-foreground">Active Maintenances</p>
                      <p className="text-lg font-bold font-mono">{counts?.activeMaintenances ?? 0}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter("custody");
                        setActiveTab("history");
                      }}
                      className="rounded-lg border bg-muted/20 p-2.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-[11px] text-muted-foreground">Checkouts / Checkins</p>
                      <p className="text-lg font-bold font-mono">
                        {counts?.checkoutsCount ?? 0} / {counts?.checkinsCount ?? 0}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryFilter("audit");
                        setActiveTab("history");
                      }}
                      className="rounded-lg border bg-muted/20 p-2.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-[11px] text-muted-foreground">Audits Logged</p>
                      <p className="text-lg font-bold font-mono">{counts?.auditsCount ?? 0}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("requests")}
                      className="rounded-lg border bg-muted/20 p-2.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-[11px] text-muted-foreground">Pending Requests</p>
                      <p className="text-lg font-bold font-mono">{counts?.pendingRequests ?? 0}</p>
                    </button>
                  </div>

                  {/* QR Code Card */}
                  <AssetQrTagCard
                    assetId={id}
                    assetTag={asset.asset_tag}
                    assetName={displayName}
                    serialNumber={asset.serial_number}
                    modelName={asset.asset_model?.name}
                    companyName={asset.company?.name}
                    settings={settings}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Maintenances */}
          {activeTab === "maintenances" && (
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Service &amp; Maintenance Log</h2>
                  <p className="text-xs text-muted-foreground">
                    Total spend: {formatMoney(tco?.maintenanceCostTotal, currency)} across{" "}
                    {maintenances.length} record(s)
                  </p>
                </div>
                {permissions.canManageMaintenances && (
                  <AssetQuickMaintenanceDialog assetId={id} assetTag={asset.asset_tag} />
                )}
              </div>

              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Expected / Done</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      {permissions.canManageMaintenances && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenances.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={permissions.canManageMaintenances ? 8 : 7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No maintenance records logged for this asset yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      maintenances.map((m) => {
                        const isCompleted = Boolean(m.completed_at);
                        const isOverdue =
                          !isCompleted &&
                          m.expected_completion_date &&
                          new Date(m.expected_completion_date).getTime() < Date.now();
                        const isBusy = maintBusyId === m._id;

                        return (
                          <TableRow key={m._id}>
                            <TableCell className="font-medium">
                              <div>
                                <p>{m.title}</p>
                                {m.notes && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {m.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {m.maintenance_type}
                                </Badge>
                                {m.is_warranty && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  >
                                    Warranty
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {m.supplier?.name || "—"}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {formatDate(m.start_date)}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {isCompleted
                                ? formatDate(m.completed_at)
                                : formatDate(m.expected_completion_date, "Open-ended")}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {formatMoney(m.cost, currency)}
                            </TableCell>
                            <TableCell>
                              {isCompleted ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                >
                                  Completed
                                </Badge>
                              ) : isOverdue ? (
                                <Badge variant="destructive">Overdue</Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/40 text-amber-700 dark:text-amber-300"
                                >
                                  In Progress
                                </Badge>
                              )}
                            </TableCell>
                            {permissions.canManageMaintenances && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleMaintenanceAction(
                                        m._id,
                                        isCompleted ? "reopen" : "complete"
                                      )
                                    }
                                  >
                                    {isBusy ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : isCompleted ? (
                                      <RotateCcw className="h-3 w-3" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                    {isCompleted ? "Reopen" : "Complete"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-rose-500 hover:text-rose-600"
                                    disabled={isBusy}
                                    onClick={() => handleMaintenanceAction(m._id, "delete")}
                                    aria-label="Delete maintenance record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Tab 3: Acceptances */}
          {activeTab === "acceptances" && (
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Custody &amp; EULA Acceptances</h2>
                  <p className="text-xs text-muted-foreground">
                    Employee sign-offs captured during asset checkout workflows.
                  </p>
                </div>
                <Link href="/acceptances">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <FileSignature className="h-3.5 w-3.5" />
                    Open Acceptances Queue
                  </Button>
                </Link>
              </div>

              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signature</TableHead>
                      <TableHead>Responded At</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acceptances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No checkout acceptance records found for this asset.
                        </TableCell>
                      </TableRow>
                    ) : (
                      acceptances.map((acc) => {
                        const accPersonName = acc.assigned_to
                          ? formatAssigneeName(acc.assigned_to, "People")
                          : acc.assigned_name || "Assignee";
                        return (
                          <TableRow key={acc._id}>
                            <TableCell className="font-medium">
                              {acc.assigned_to?._id ? (
                                <Link
                                  href={`/people/${acc.assigned_to._id}`}
                                  className="hover:underline text-blue-600 dark:text-blue-400"
                                >
                                  {accPersonName}
                                </Link>
                              ) : (
                                accPersonName
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  acc.status === "accepted"
                                    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                                    : acc.status === "declined"
                                    ? "border-rose-500/40 text-rose-700 dark:text-rose-300"
                                    : "border-amber-500/40 text-amber-700 dark:text-amber-300"
                                }
                              >
                                {acc.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {acc.signature || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {acc.accepted_at
                                ? formatDateTime(acc.accepted_at)
                                : acc.declined_at
                                ? formatDateTime(acc.declined_at)
                                : formatDateTime(acc.createdAt)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {acc.note || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Tab 4: Requests */}
          {activeTab === "requests" && (
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Checkout Requests</h2>
                  <p className="text-xs text-muted-foreground">
                    Requests submitted specifically for #{asset.asset_tag}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/requests?create=1&itemType=Asset&itemId=${id}`}>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Request Asset
                    </Button>
                  </Link>
                  <Link href="/requests">
                    <Button size="sm" variant="ghost" className="text-xs">
                      View All Requests
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Requester</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No requests have been submitted for this asset.
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((reqRow) => (
                        <TableRow key={reqRow._id}>
                          <TableCell className="font-medium">
                            {reqRow.requester?._id ? (
                              <Link
                                href={`/people/${reqRow.requester._id}`}
                                className="hover:underline text-blue-600 dark:text-blue-400"
                              >
                                {formatAssigneeName(reqRow.requester, "People") || reqRow.requester_name}
                              </Link>
                            ) : (
                              reqRow.requester_name
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{reqRow.quantity || 1}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                reqRow.status === "fulfilled"
                                  ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                                  : reqRow.status === "canceled"
                                  ? "border-zinc-500/30 text-muted-foreground"
                                  : "border-amber-500/40 text-amber-700 dark:text-amber-300"
                              }
                            >
                              {reqRow.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(reqRow.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {reqRow.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Tab 5: History */}
          {activeTab === "history" && (
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { key: "all", label: "All Events" },
                      { key: "custody", label: "Checkouts & Acceptances" },
                      { key: "audit", label: "Audits" },
                      { key: "maintenance", label: "Maintenances" },
                      { key: "updates", label: "Edits" },
                    ] as const
                  ).map((item) => (
                    <Button
                      key={item.key}
                      type="button"
                      size="sm"
                      variant={historyFilter === item.key ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setHistoryFilter(item.key)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>

                <ExportButton
                  filename={`asset_${asset.asset_tag}_history`}
                  sheetName="Asset History"
                  data={filteredLogs}
                  allData={activityLogs}
                  columns={historyExportColumns}
                />
              </div>

              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No activity events match the selected filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log._id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase text-[10px]">
                              {log.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.target_type === "People" && log.target_id ? (
                              <Link
                                href={`/people/${log.target_id}`}
                                className="hover:underline text-blue-600 dark:text-blue-400"
                              >
                                {log.target_name || "Person"}
                              </Link>
                            ) : (
                              log.target_name || "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{log.admin_name || "Admin"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Right Sticky Operational Rail */}
        <aside className="space-y-4 xl:sticky xl:top-4">
          {/* Quick Action Strip + Device Showcase */}
          <div className="rounded-2xl border bg-card p-4 space-y-4">
            {/* Color-coded compact icon toolbar */}
            <TooltipProvider>
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                {permissions.canCheckoutCheckin &&
                  (isAssigned ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <AssetCheckinDialog
                            assetId={id}
                            assetTag={asset.asset_tag}
                            assetName={displayName}
                            assignedToName={assignedName}
                            trigger={
                              <Button
                                size="icon"
                                className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                                aria-label="Check In Asset"
                              >
                                <LogIn className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Check In Asset</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <AssetCheckoutDialog
                            assetId={id}
                            assetTag={asset.asset_tag}
                            assetName={displayName}
                            trigger={
                              <Button
                                size="icon"
                                className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white"
                                aria-label="Check Out Asset"
                              >
                                <LogOut className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Check Out Asset</TooltipContent>
                    </Tooltip>
                  ))}

                {permissions.canCreateEditAssets && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <AssetEditForm
                          id={id}
                          trigger={
                            <Button
                              size="icon"
                              className="h-9 w-9 bg-amber-500 hover:bg-amber-600 text-white"
                              aria-label="Edit Asset"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Edit Asset Details</TooltipContent>
                  </Tooltip>
                )}

                {permissions.canAuditAssets && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <AssetAuditDialog
                          assetId={id}
                          assetTag={asset.asset_tag}
                          currentLocationId={asset.location?._id}
                          trigger={
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 text-teal-600 dark:text-teal-400 border-teal-500/40 hover:bg-teal-500/10"
                              aria-label="Record Physical Audit"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Log Physical Audit</TooltipContent>
                  </Tooltip>
                )}

                {permissions.canManageMaintenances && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <AssetQuickMaintenanceDialog
                          assetId={id}
                          assetTag={asset.asset_tag}
                          trigger={
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9"
                              aria-label="Log Maintenance"
                            >
                              <Wrench className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Log Maintenance</TooltipContent>
                  </Tooltip>
                )}

                {permissions.canDeleteAssets && (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-9 w-9"
                            disabled={isDeleting}
                            aria-label="Delete Asset"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Delete Asset</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete #{asset.asset_tag}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will move <strong>{displayName}</strong> into Deleted Assets trash, where it can be restored or permanently purged later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={handleDeleteAsset}
                        >
                          Move to Deleted
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </TooltipProvider>

            {/* Device Showcase Frame */}
            <div className="relative group rounded-xl border bg-muted/20 overflow-hidden aspect-[4/3] flex items-center justify-center p-3">
              {heroImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImage}
                    alt={displayName}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 absolute top-2.5 right-2.5 opacity-80 group-hover:opacity-100"
                    onClick={() => setPhotoModalOpen(true)}
                    aria-label="Enlarge asset image"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Badge
                    variant="secondary"
                    className="absolute bottom-2 left-2 text-[10px] opacity-90"
                  >
                    {isCustomPhoto ? "Asset Photo" : "Model Photo"}
                  </Badge>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground p-4">
                  <div className="h-12 w-12 rounded-2xl border bg-background flex items-center justify-center">
                    <Laptop className="h-6 w-6 opacity-70" />
                  </div>
                  <p className="text-xs font-medium text-foreground/80">
                    {asset.asset_model?.name || displayName}
                  </p>
                  <p className="text-[11px]">No hardware image uploaded</p>
                </div>
              )}
            </div>

            {/* Custodian Spotlight Card */}
            <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Custodian</span>
                {asset.assigned_type && (
                  <Badge variant="outline" className="text-[10px]">
                    {asset.assigned_type}
                  </Badge>
                )}
              </div>

              {isAssigned ? (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {assignedName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {assigneeHref ? (
                      <Link
                        href={assigneeHref}
                        className="text-sm font-semibold hover:underline text-blue-600 dark:text-blue-400 block truncate"
                      >
                        {assignedName}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold truncate">{assignedName}</p>
                    )}
                    {asset.assigned_to?.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {asset.assigned_to.email}
                      </p>
                    )}
                    {asset.checkout_date && (
                      <p className="text-[11px] text-muted-foreground">
                        Since {formatDate(asset.checkout_date)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Available in Stock</p>
                    <p className="text-[11px] text-muted-foreground">Ready for assignment</p>
                  </div>
                  {permissions.canCheckoutCheckin ? (
                    <AssetCheckoutDialog
                      assetId={id}
                      assetTag={asset.asset_tag}
                      assetName={displayName}
                      trigger={
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">
                          Assign
                        </Button>
                      }
                    />
                  ) : (
                    <Link href={`/requests?create=1&itemType=Asset&itemId=${id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">
                        Request
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Metadata & Vendor Support Dossier */}
            <div className="divide-y text-xs">
              <div className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  Record ID
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-mono text-[11px] truncate max-w-[140px]">
                    {asset._id}
                  </span>
                  <CopyButton value={String(asset._id)} label="Record ID" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  Asset Model
                </span>
                <Link
                  href={`/assets/listall?search=${encodeURIComponent(asset.asset_model?.name || "")}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[170px]"
                >
                  {asset.asset_model?.name || "N/A"}
                </Link>
              </div>

              {(details?.sameModelCount || 0) > 1 && (
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <span className="text-muted-foreground">Same-Model Fleet</span>
                  <Link
                    href={`/assets/listall?search=${encodeURIComponent(asset.asset_model?.name || "")}`}
                    className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {details.sameModelCount} units
                  </Link>
                </div>
              )}

              <div className="py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Factory className="h-3.5 w-3.5 shrink-0" />
                    Manufacturer
                  </span>
                  <span className="font-medium truncate max-w-[160px]">
                    {asset.manufacturer?.name || "N/A"}
                  </span>
                </div>
                {(asset.manufacturer?.support_url ||
                  asset.manufacturer?.support_email ||
                  asset.manufacturer?.support_phone) && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-[11px]">
                    {asset.manufacturer.support_url && (
                      <a
                        href={asset.manufacturer.support_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Support <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {asset.manufacturer.support_email && (
                      <a
                        href={`mailto:${asset.manufacturer.support_email}`}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    )}
                    {asset.manufacturer.support_phone && (
                      <a
                        href={`tel:${asset.manufacturer.support_phone}`}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" /> {asset.manufacturer.support_phone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 shrink-0" />
                    Supplier
                  </span>
                  <span className="font-medium truncate max-w-[160px]">
                    {asset.supplier?.name || "N/A"}
                  </span>
                </div>
                {(asset.supplier?.email || asset.supplier?.phone) && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-[11px] text-muted-foreground">
                    {asset.supplier.email && (
                      <a href={`mailto:${asset.supplier.email}`} className="hover:text-foreground">
                        {asset.supplier.email}
                      </a>
                    )}
                    {asset.supplier.phone && (
                      <a href={`tel:${asset.supplier.phone}`} className="hover:text-foreground">
                        {asset.supplier.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-muted-foreground">Created</span>
                <span className="text-muted-foreground">{formatDateTime(asset.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="text-muted-foreground">{formatDateTime(asset.updatedAt)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Full-Resolution Asset Photo Modal */}
      {heroImage && (
        <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span>#{asset.asset_tag}</span>
                <span className="text-muted-foreground font-normal">— {displayName}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center rounded-xl border bg-muted/20 p-4 max-h-[65vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={displayName}
                className="max-h-[55vh] w-auto object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_minmax(0,1fr)] gap-1 sm:gap-3 px-4 py-2.5 items-center">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
