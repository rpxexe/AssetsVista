"use client";

import React, { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  History,
  KeyRound,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PeopleEditForm from "@/components/forms/People/PeopleEditForm";
import SignOffSheetModal from "@/components/people/SignOffSheetModal";
import AssetCheckinDialog from "@/components/forms/Assets/AssetCheckinDialog";
import { ImageThumbnail } from "@/components/ImageThumbnail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PersonDetailPage({ params }: PageProps) {
  const { id } = use(params);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="animate-spin h-10 w-10 text-muted-foreground" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-medium">Could not load person details.</p>
        <Link href="/people">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to People
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border rounded-[2.5em] p-4 bg-card">
        <div className="flex items-center gap-3">
          <Link href="/people">
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

        <div className="flex items-center gap-2">
          <SignOffSheetModal person={person} />
          <PeopleEditForm id={id} />
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
          onClick={() => setActiveTab("assets")}
        >
          <Laptop className="mr-2 h-4 w-4" />
          Assets ({assignedAssets.length})
        </Button>
        <Button
          variant={activeTab === "licenses" ? "default" : "ghost"}
          className="rounded-b-none"
          onClick={() => setActiveTab("licenses")}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Licenses ({assignedLicenses.length})
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          className="rounded-b-none"
          onClick={() => setActiveTab("history")}
        >
          <History className="mr-2 h-4 w-4" />
          History ({activityLogs.length})
        </Button>
      </div>

      {/* Tab 1: Assigned Assets */}
      {activeTab === "assets" && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
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
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No hardware assets currently checked out to this person.
                  </TableCell>
                </TableRow>
              ) : (
                assignedAssets.map((asset: any) => (
                  <TableRow key={asset._id}>
                    <TableCell>
                      <ImageThumbnail
                        src={asset.image || asset.asset_model?.image}
                        alt={asset.asset_name || asset.asset_tag}
                        fallback="asset"
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="font-mono font-semibold uppercase">
                      {asset.asset_tag}
                    </TableCell>
                    <TableCell className="font-medium">{asset.asset_name}</TableCell>
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
                      <AssetCheckinDialog
                        assetId={asset._id}
                        assetTag={asset.asset_tag}
                        assetName={asset.asset_name}
                        assignedToName={fullName}
                      />
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
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No software licenses assigned to this person.
                  </TableCell>
                </TableRow>
              ) : (
                assignedLicenses.map((lic: any) => (
                  <TableRow key={lic._id}>
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
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No history logs for this person yet.
                  </TableCell>
                </TableRow>
              ) : (
                activityLogs.map((log: any) => (
                  <TableRow key={log._id}>
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
    </div>
  );
}

