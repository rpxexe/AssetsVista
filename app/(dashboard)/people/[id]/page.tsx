"use client";

import React, { use } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  DoorOpen,
  FileText,
  History,
  KeyRound,
  Laptop,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  User,
} from "lucide-react";
import { PersonDetailSkeleton } from "@/components/skeletons/AppSkeletons";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/BulkActionBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useToast } from "@/hooks/use-toast";
import { executeBulkAction } from "@/lib/bulkClient";
import { getClientErrorMessage } from "@/lib/errorMessages";
import type { ExportColumnDef } from "@/lib/exportData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PeopleEditForm from "@/components/forms/People/PeopleEditForm";
import { OffboardPersonDialog } from "@/components/people/OffboardPersonDialog";
import SignOffSheetModal from "@/components/people/SignOffSheetModal";
import AssetCheckinDialog from "@/components/forms/Assets/AssetCheckinDialog";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import { usePermissions } from "@/hooks/usePermissions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PersonDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bulk = useBulkSelection();

  const {
    data: person,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["person", id],
    queryFn: async () => {
      const response = await axios.get(`/api/core/people/${id}`);
      return response.data.data;
    },
  });

  const [activeTab, setActiveTab] = React.useState<"assets" | "licenses" | "history">("assets");
  const [offboardOpen, setOffboardOpen] = React.useState(false);

  if (isLoading) {
    return <PersonDetailSkeleton />;
  }

  if (error || !person) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-medium">Could not load person details.</p>
        <Link href={permissions.canViewPeople ? "/people" : "/admin"}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {permissions.canViewPeople ? "Back to People" : "Back to Dashboard"}
          </Button>
        </Link>
      </div>
    );
  }

  const assignedAssets = person.assigned_assets || [];
  const assignedLicenses = person.assigned_licenses || [];
  const activityLogs = person.activity_logs || [];
  const fullName =
    person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim() || "User";

  const selectedAssets = assignedAssets.filter((a: any) => bulk.isSelected(a._id));
  const selectedLicenses = assignedLicenses.filter((l: any) => bulk.isSelected(l._id));
  const selectedLogs = activityLogs.filter((log: any) => bulk.isSelected(log._id));

  const assetExportColumns: ExportColumnDef<any>[] = [
    { header: "Asset Tag", accessor: (a) => a.asset_tag || "-" },
    { header: "Name", accessor: (a) => a.asset_name || "-" },
    { header: "Model", accessor: (a) => a.asset_model?.name || "-" },
    { header: "Serial Number", accessor: (a) => a.serial_number || "-" },
    { header: "Status", accessor: (a) => a.status?.name || "Deployed" },
    {
      header: "Checkout Date",
      accessor: (a) => (a.checkout_date ? format(new Date(a.checkout_date), "yyyy-MM-dd") : ""),
    },
    { header: "Cost ($)", accessor: (a) => Number(a.purchase_cost) || 0 },
  ];

  const licenseExportColumns: ExportColumnDef<any>[] = [
    { header: "Software Name", accessor: (l) => l.name || "-" },
    { header: "Category", accessor: (l) => l.category?.name || "-" },
    { header: "Manufacturer", accessor: (l) => l.manufacturer?.name || "-" },
    { header: "License To Email", accessor: (l) => l.license_to_email || person.email || "-" },
    {
      header: "Expiry Date",
      accessor: (l) => (l.expiry_date ? format(new Date(l.expiry_date), "yyyy-MM-dd") : "Never"),
    },
  ];

  const historyExportColumns: ExportColumnDef<any>[] = [
    {
      header: "Date",
      accessor: (log) =>
        log.created_at || log.createdAt
          ? new Date(log.created_at || log.createdAt).toLocaleString()
          : "",
    },
    { header: "Action", accessor: (log) => log.action_type || "-" },
    { header: "Item Type", accessor: (log) => log.item_type || "-" },
    { header: "Item Name", accessor: (log) => log.item_name || log.item_id || "-" },
    { header: "Actor", accessor: (log) => log.user?.name || log.user?.username || "Admin" },
    { header: "Notes", accessor: (log) => log.note || "" },
  ];

  const handlePersonTabChange = (tab: "assets" | "licenses" | "history") => {
    setActiveTab(tab);
    bulk.clear();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[2.5em] p-4 bg-card">
        <div className="flex items-center gap-3">
          <Link href={permissions.canViewPeople ? "/people" : "/admin"}>
            <Button size="icon" variant="ghost" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          {person.image ? (
            <ImageThumbnail
              src={person.image}
              alt={fullName}
              fallback="person"
              size="lg"
              rounded="full"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
              {person.first_name?.[0] || person.name?.[0] || "U"}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{fullName}</h2>
              {person.employee_num && (
                <Badge variant="outline" className="font-mono text-xs">
                  {person.employee_num}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {person.title || "Employee"} {person.username ? `(@${person.username})` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SignOffSheetModal person={person} />
          {permissions.canManagePeople &&
            (assignedAssets.length > 0 ||
              assignedLicenses.length > 0 ||
              Boolean(person.user_id && person.isActive !== false) ||
              (person.active_api_keys_count ?? 0) > 0 ||
              Boolean(person.end_date)) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-amber-600 dark:text-amber-300 border-amber-500/40"
                onClick={() => setOffboardOpen(true)}
              >
                <DoorOpen className="h-4 w-4" />
                Offboard
              </Button>
            )}
          {permissions.canManagePeople && <PeopleEditForm id={id} />}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-2xl p-4 flex flex-col justify-between bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase">Assigned Assets</span>
            <Laptop className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold">{assignedAssets.length}</span>
            <span className="text-xs text-muted-foreground ml-1">items checked out</span>
          </div>
        </div>

        <div className="border rounded-2xl p-4 flex flex-col justify-between bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase">Asset Value</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold">
              ${(person.total_asset_value || 0).toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground ml-1">total hardware cost</span>
          </div>
        </div>

        <div className="border rounded-2xl p-4 flex flex-col justify-between bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase">Assigned Licenses</span>
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold">{assignedLicenses.length}</span>
            <span className="text-xs text-muted-foreground ml-1">software seats</span>
          </div>
        </div>

        <div className="border rounded-2xl p-4 flex flex-col justify-between bg-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase">Activity Events</span>
            <History className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold">{activityLogs.length}</span>
            <span className="text-xs text-muted-foreground ml-1">logs recorded</span>
          </div>
        </div>
      </div>

      {/* User Attributes Strip */}
      <div className="border rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/20 text-xs">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium truncate">{person.email || "N/A"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium truncate">{person.phone || "N/A"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground">Department / Company</p>
            <p className="font-medium truncate">
              {person.department?.name || "-"} / {person.company?.name || "-"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground">Location</p>
            <p className="font-medium truncate">{person.location?.name || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "assets" ? "default" : "ghost"}
          className="rounded-b-none"
          onClick={() => handlePersonTabChange("assets")}
        >
          <Laptop className="mr-2 h-4 w-4" />
          Assets ({assignedAssets.length})
        </Button>
        <Button
          variant={activeTab === "licenses" ? "default" : "ghost"}
          className="rounded-b-none"
          onClick={() => handlePersonTabChange("licenses")}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Licenses ({assignedLicenses.length})
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          className="rounded-b-none"
          onClick={() => handlePersonTabChange("history")}
        >
          <History className="mr-2 h-4 w-4" />
          History ({activityLogs.length})
        </Button>
      </div>

      {activeTab === "assets" && (
        <BulkActionBar
          selectedCount={selectedAssets.length}
          entityLabel="asset"
          onClearSelection={bulk.clear}
          exportConfig={{
            filename: `${fullName.toLowerCase().replace(/\s+/g, "_")}_assigned_assets_selected`,
            sheetName: "Assigned Assets",
            data: selectedAssets,
            columns: assetExportColumns,
          }}
          actions={
            permissions.canCheckoutCheckin
              ? [
                  {
                    id: "bulk-checkin-person-assets",
                    label: "Checkin Selected",
                    icon: <RotateCcw size={14} />,
                    confirmTitle: `Check in ${selectedAssets.length} selected asset(s) from ${fullName}?`,
                    confirmDescription:
                      "Selected assets will be unassigned and reset to Ready to Deploy / Available.",
                    onExecute: async () => {
                      try {
                        const res = await executeBulkAction({
                          entity: "asset",
                          action: "checkin",
                          ids: selectedAssets.map((a: any) => a._id),
                        });
                        toast({ title: "Bulk Checkin Complete", description: res.message });
                        bulk.clear();
                        await Promise.all([
                          refetch(),
                          queryClient.invalidateQueries({ queryKey: ["person", id] }),
                          queryClient.invalidateQueries({ queryKey: ["assets"] }),
                          queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
                          queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] }),
                        ]);
                      } catch (err) {
                        toast({
                          title: "Bulk Checkin Failed",
                          description: getClientErrorMessage(
                            err,
                            "Failed to check in selected assets."
                          ),
                          variant: "destructive",
                        });
                      }
                    },
                  },
                ]
              : []
          }
        />
      )}

      {activeTab === "licenses" && (
        <BulkActionBar
          selectedCount={selectedLicenses.length}
          entityLabel="license"
          onClearSelection={bulk.clear}
          exportConfig={{
            filename: `${fullName.toLowerCase().replace(/\s+/g, "_")}_assigned_licenses_selected`,
            sheetName: "Assigned Licenses",
            data: selectedLicenses,
            columns: licenseExportColumns,
          }}
          actions={[]}
        />
      )}

      {activeTab === "history" && (
        <BulkActionBar
          selectedCount={selectedLogs.length}
          entityLabel="activity log"
          onClearSelection={bulk.clear}
          exportConfig={{
            filename: `${fullName.toLowerCase().replace(/\s+/g, "_")}_history_selected`,
            sheetName: "History",
            data: selectedLogs,
            columns: historyExportColumns,
          }}
          actions={[]}
        />
      )}

      {/* Tab 1: Assigned Assets */}
      {activeTab === "assets" && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(assignedAssets.map((a: any) => a._id))}
                    onCheckedChange={(checked) =>
                      bulk.toggleAll(
                        assignedAssets.map((a: any) => a._id),
                        !!checked
                      )
                    }
                    aria-label="Select all assigned assets"
                  />
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checkout Date</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No hardware assets currently checked out to this person.
                  </TableCell>
                </TableRow>
              ) : (
                assignedAssets.map((asset: any) => (
                  <TableRow key={asset._id}>
                    <TableCell>
                      <Checkbox
                        checked={bulk.isSelected(asset._id)}
                        onCheckedChange={(checked) => bulk.toggleOne(asset._id, !!checked)}
                        aria-label={`Select ${asset.asset_tag || asset.asset_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <ImageThumbnail
                        src={asset.image || asset.asset_model?.image}
                        alt={asset.asset_name || asset.asset_tag}
                        fallback="asset"
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="font-mono font-semibold uppercase">
                      <Link
                        href={`/assets/view/${asset._id}`}
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        {asset.asset_tag}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/assets/view/${asset._id}`} className="hover:underline">
                        {asset.asset_name}
                      </Link>
                    </TableCell>
                    <TableCell>{asset.asset_model?.name || "-"}</TableCell>
                    <TableCell className="font-mono">{asset.serial_number || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.status?.name || "Deployed"}</Badge>
                    </TableCell>
                    <TableCell>
                      {asset.checkout_date
                        ? format(new Date(asset.checkout_date), "PP")
                        : "N/A"}
                    </TableCell>
                    <TableCell>${asset.purchase_cost ?? 0}</TableCell>
                    <TableCell className="text-right">
                      {permissions.canCheckoutCheckin ? (
                        <AssetCheckinDialog
                          assetId={asset._id}
                          assetTag={asset.asset_tag}
                          assetName={asset.asset_name}
                          assignedToName={fullName}
                        />
                      ) : (
                        <Link href={`/assets/view/${asset._id}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            View Asset
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab 2: Assigned Licenses */}
      {activeTab === "licenses" && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(assignedLicenses.map((l: any) => l._id))}
                    onCheckedChange={(checked) =>
                      bulk.toggleAll(
                        assignedLicenses.map((l: any) => l._id),
                        !!checked
                      )
                    }
                    aria-label="Select all assigned licenses"
                  />
                </TableHead>
                <TableHead>Software Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>License To Email</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedLicenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No software licenses assigned to this person.
                  </TableCell>
                </TableRow>
              ) : (
                assignedLicenses.map((lic: any) => (
                  <TableRow key={lic._id}>
                    <TableCell>
                      <Checkbox
                        checked={bulk.isSelected(lic._id)}
                        onCheckedChange={(checked) => bulk.toggleOne(lic._id, !!checked)}
                        aria-label={`Select ${lic.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-semibold">{lic.name}</TableCell>
                    <TableCell>{lic.category?.name || "-"}</TableCell>
                    <TableCell>{lic.manufacturer?.name || "-"}</TableCell>
                    <TableCell>{lic.license_to_email || person.email || "-"}</TableCell>
                    <TableCell>
                      {lic.expiry_date
                        ? format(new Date(lic.expiry_date), "PP")
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab 3: History & Activity Log */}
      {activeTab === "history" && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bulk.headerCheckState(activityLogs.map((log: any) => log._id))}
                    onCheckedChange={(checked) =>
                      bulk.toggleAll(
                        activityLogs.map((log: any) => log._id),
                        !!checked
                      )
                    }
                    aria-label="Select all history logs"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Item Type</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No history logs for this person yet.
                  </TableCell>
                </TableRow>
              ) : (
                activityLogs.map((log: any) => (
                  <TableRow key={log._id}>
                    <TableCell>
                      <Checkbox
                        checked={bulk.isSelected(log._id)}
                        onCheckedChange={(checked) => bulk.toggleOne(log._id, !!checked)}
                        aria-label={`Select log ${log.item_name || log._id}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.created_at
                        ? format(new Date(log.created_at), "PPp")
                        : format(new Date(log.createdAt), "PPp")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.action_type === "checkout"
                            ? "default"
                            : log.action_type === "checkin"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {log.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.item_type}</TableCell>
                    <TableCell className="font-medium">{log.item_name || log.item_id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.user?.name || log.user?.username || "Admin"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.note || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <OffboardPersonDialog
        person={person}
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
        onCompleted={() => refetch()}
      />
    </div>
  );
}

