"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Database,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Terminal,
  Trash2,
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
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";
import type { DemoSeedSummary } from "@/lib/demoData";
import { DevToolsSkeleton } from "@/components/skeletons/AppSkeletons";

type PendingConfirm = null | "reset_inventory" | "reset_all_dev" | "reset_and_seed";

export default function DevToolsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canAccessDevTools, dbUser, isLoading } = usePermissions();

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingConfirm>(null);
  const [lastSeedSummary, setLastSeedSummary] = useState<DemoSeedSummary | null>(null);

  if (isLoading) {
    return <DevToolsSkeleton />;
  }

  if (!canAccessDevTools) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 min-h-[65vh]">
        <div className="max-w-md w-full rounded-[2em] border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/60">
            <Lock className="h-5 w-5 text-foreground" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">Developer Tools Restricted</h1>
            <p className="text-sm text-muted-foreground">
              Dummy data seeding and developer reset controls are disabled in production and hidden
              from standard user accounts.
            </p>
          </div>
          <Link href="/admin" className="inline-block">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleLoadDummyData = async () => {
    setBusyAction("seed");
    try {
      const res = await axios.post("/api/demo/seed");
      setLastSeedSummary(res.data?.data ?? null);
      await queryClient.invalidateQueries();
      toast({
        title: "Dummy Data Loaded",
        description:
          res.data?.message ||
          "Sample companies, locations, people, assets, licenses, and logs seeded.",
      });
    } catch (err) {
      toast({
        title: "Seed Failed",
        description: getClientErrorMessage(err, "Unable to seed dummy data."),
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmedReset = async () => {
    if (!confirmAction) return;
    setBusyAction(confirmAction);
    try {
      if (confirmAction === "reset_and_seed") {
        await axios.post("/api/settings/purge", { mode: "reset_all_dev" });
        const seedRes = await axios.post("/api/demo/seed");
        setLastSeedSummary(seedRes.data?.data ?? null);
        await queryClient.invalidateQueries();
        toast({
          title: "Database Reset & Reloaded",
          description: "Cleared workspace collections and loaded a clean dummy dataset.",
        });
      } else {
        const res = await axios.post("/api/settings/purge", { mode: confirmAction });
        setLastSeedSummary(null);
        await queryClient.invalidateQueries();
        toast({
          title: "Workspace Reset Complete",
          description: res.data?.message || "Selected collections were cleared.",
        });
      }
      setConfirmAction(null);
    } catch (err) {
      toast({
        title: "Action Failed",
        description: getClientErrorMessage(err, "Unable to complete developer reset."),
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const summaryItems = lastSeedSummary
    ? [
        { label: "Assets", count: lastSeedSummary.assets },
        { label: "Licenses", count: lastSeedSummary.licenses },
        { label: "Accessories", count: lastSeedSummary.accessories },
        { label: "Components", count: lastSeedSummary.components },
        { label: "Consumables", count: lastSeedSummary.consumables },
        { label: "People", count: lastSeedSummary.people },
        { label: "Maintenances", count: lastSeedSummary.maintenances },
        { label: "Requests", count: lastSeedSummary.requests },
        { label: "Acceptances", count: lastSeedSummary.acceptances },
        { label: "Activity Logs", count: lastSeedSummary.actionLogs },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 max-w-5xl">
      <div className="border rounded-[2.5em] p-5 bg-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/60">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Developer Seed &amp; Reset</h1>
              <Badge variant="outline" className="font-mono text-[10px]">
                DEV MODE ONLY
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Private developer console for {dbUser?.email} — hidden from sidebar &amp; normal users
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[1.75em] border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" />
              Populate Dummy Data
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Idempotently seeds sample companies, locations, categories, models, people, assets,
              licenses, accessories, components, consumables, maintenances, and activity logs into
              your workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleLoadDummyData}
              disabled={Boolean(busyAction)}
              className="gap-2"
            >
              {busyAction === "seed" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {busyAction === "seed" ? "Loading Dummy Data..." : "Load Dummy Data"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction("reset_and_seed")}
              disabled={Boolean(busyAction)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset &amp; Reload Dummy Data
            </Button>
          </div>
        </div>

        <div className="rounded-[1.75em] border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Reset Workspace Database
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clear workspace records before re-seeding or testing fresh states. Your login account
              and app settings stay active so you remain signed in.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction("reset_inventory")}
              disabled={Boolean(busyAction)}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Inventory Only
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmAction("reset_all_dev")}
              disabled={Boolean(busyAction)}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Reset All Workspace Data
            </Button>
          </div>
        </div>
      </div>

      {summaryItems.length > 0 && (
        <div className="rounded-[1.75em] border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Latest Dummy Seed Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-xl border bg-muted/30 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold tabular-nums">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[1.75em] border bg-card p-6 space-y-2.5 text-xs text-muted-foreground">
        <p className="text-sm font-semibold text-foreground">
          How this stays hidden from normal users
        </p>
        <p>
          1. <strong>Development-only server enforcement</strong>: Both{" "}
          <code className="text-foreground">POST /api/demo/seed</code> and full workspace reset
          return <code className="text-foreground">403 Forbidden</code> when running in production (
          <code className="text-foreground">NODE_ENV=production</code>).
        </p>
        <p>
          2. <strong>Hidden from normal navigation &amp; dashboard</strong>: Removed from{" "}
          <code className="text-foreground">/admin</code> and omitted from the sidebar menu, so{" "}
          <code className="text-foreground">assets_user</code>,{" "}
          <code className="text-foreground">requester</code>, and end users never see it.
        </p>
        <p>
          3. <strong>Optional email lock in dev</strong>: Add{" "}
          <code className="text-foreground">DEV_TOOLS_EMAIL=&quot;{dbUser?.email || "you@company.com"}&quot;</code>{" "}
          to <code className="text-foreground">.env.local</code> so only your personal Admin login
          can access <code className="text-foreground">/dev-tools</code> even in development mode.
        </p>
        <p>
          4. <strong>After a complete MongoDB drop</strong>: Register/log in as Admin first,
          complete or skip <code className="text-foreground">/setup</code>, then visit{" "}
          <code className="text-foreground">/dev-tools</code> (or{" "}
          <code className="text-foreground">/settings</code> -&gt; Developer Data &amp; Seed) and
          click <strong>Load Dummy Data</strong>.
        </p>
      </div>

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "reset_and_seed"
                ? "Reset workspace and reload dummy data?"
                : confirmAction === "reset_all_dev"
                ? "Reset all workspace data?"
                : "Reset workspace inventory?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "reset_inventory"
                ? "Clears all Assets, Licenses, Accessories, Consumables, Components, Maintenances, Requests, Acceptances, and Action Logs. People and Taxonomies are kept."
                : "Clears all inventory, People directory records, Settings taxonomies (Companies, Locations, Categories, Status labels, Models), and audit logs while keeping login accounts and app settings."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyAction)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedReset}
              disabled={Boolean(busyAction)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busyAction ? "Working..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

