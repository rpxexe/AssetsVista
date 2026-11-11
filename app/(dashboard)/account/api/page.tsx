"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { Skeleton } from "skullet/react";
import { SampleTableRows } from "@/components/skeletons/AppSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import {
  API_KEY_EXPIRATION_OPTIONS,
  ApiKeyExpirationPreset,
} from "@/lib/apiKeyFormat";
import { getClientErrorMessage } from "@/lib/errorMessages";
import { ROLE_METADATA } from "@/lib/rbac";

interface ApiKeyItem {
  _id: string;
  name: string;
  notes: string;
  keyPrefix: string;
  maskedToken: string;
  status: "active" | "expired" | "revoked";
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

type StatusFilter = "all" | "active" | "inactive";

const ENDPOINT_REFERENCE = [
  { method: "GET", path: "/api/auth/me", purpose: "Verify token owner, workspace & RBAC permissions" },
  { method: "GET / POST", path: "/api/core/asset", purpose: "List workspace assets or create new assets" },
  { method: "GET / PATCH", path: "/api/core/asset/[id]", purpose: "Inspect, update, or soft-delete a single asset" },
  { method: "GET / POST", path: "/api/core/license", purpose: "Read or manage software license seats" },
  { method: "GET / POST", path: "/api/core/accessories", purpose: "List or add accessories" },
  { method: "GET / POST", path: "/api/core/people", purpose: "Read or manage directory users & assignees" },
  { method: "GET / POST", path: "/api/core/maintenance", purpose: "Track asset repair and maintenance logs" },
];

export default function ManageApiKeysPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, dbUser } = usePermissions();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Token Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenNotes, setTokenNotes] = useState("");
  const [expirationPreset, setExpirationPreset] = useState<ApiKeyExpirationPreset>("1y");
  const [creating, setCreating] = useState(false);

  // One-time Plain-Text Token Reveal Modal state
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealedToken, setRevealedToken] = useState("");
  const [revealedKeyName, setRevealedKeyName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Revoke / Remove Confirmation Modal state
  const [revokeTarget, setRevokeTarget] = useState<{
    key: ApiKeyItem;
    purge: boolean;
  } | null>(null);
  const [revoking, setRevoking] = useState(false);

  const [origin, setOrigin] = useState("https://your-assetsvista-host");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const apiBaseUrl = `${origin}/api`;

  const { data, isLoading } = useQuery<{
    keys: ApiKeyItem[];
    ownerEmail?: string;
    role?: string;
  }>({
    queryKey: ["personal-api-keys"],
    queryFn: async () => {
      const res = await axios.get("/api/account/api-keys");
      return res.data?.data ?? { keys: [] };
    },
  });

  const allKeys = useMemo(() => data?.keys ?? [], [data?.keys]);
  const activeCount = useMemo(
    () => allKeys.filter((k) => k.status === "active").length,
    [allKeys]
  );

  const filteredKeys = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allKeys.filter((item) => {
      if (statusFilter === "active" && item.status !== "active") return false;
      if (statusFilter === "inactive" && item.status === "active") return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.keyPrefix.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q)
      );
    });
  }, [allKeys, statusFilter, searchQuery]);

  const handleCopy = async (text: string, id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({
        title: `${label} copied`,
        description: "Copied to your clipboard.",
      });
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select and copy the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenName.trim();
    if (trimmed.length < 2) {
      toast({
        title: "Token name required",
        description: "Please enter a descriptive name (at least 2 characters).",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post("/api/account/api-keys", {
        name: trimmed,
        notes: tokenNotes.trim(),
        expirationPreset,
      });

      const plainText: string | undefined = res.data?.data?.plainTextToken;
      if (!plainText) {
        throw new Error("Server did not return a generated token.");
      }

      setRevealedToken(plainText);
      setRevealedKeyName(trimmed);
      setCreateOpen(false);
      setRevealOpen(true);
      setTokenName("");
      setTokenNotes("");
      setExpirationPreset("1y");
      await queryClient.invalidateQueries({ queryKey: ["personal-api-keys"] });
    } catch (error) {
      toast({
        title: "Could not create API token",
        description: getClientErrorMessage(error, "Failed to generate token."),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const { key, purge } = revokeTarget;
      const params = new URLSearchParams({ id: key._id });
      if (purge) params.set("purge", "1");

      await axios.delete(`/api/account/api-keys?${params.toString()}`);
      toast({
        title: purge ? "Token record deleted" : "API token revoked",
        description: purge
          ? `Removed "${key.name}" from your token history.`
          : `"${key.name}" can no longer authenticate API requests.`,
      });
      setRevokeTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["personal-api-keys"] });
    } catch (error) {
      toast({
        title: "Action failed",
        description: getClientErrorMessage(error, "Could not update API token."),
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  };

  const handleCloseRevealModal = (open: boolean) => {
    setRevealOpen(open);
    if (!open) {
      setRevealedToken("");
      setRevealedKeyName("");
    }
  };

  const sampleCurlCommand = `curl -s "${apiBaseUrl}/auth/me" \\\n  -H "Authorization: Bearer ${
    revealedToken || "YOUR_PERSONAL_ACCESS_TOKEN"
  }" \\\n  -H "Accept: application/json"`;

  return (
    <div className="bg-background p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card">
              <KeyRound className="h-4 w-4 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Manage API Keys</h1>
            <Badge variant="outline" className="text-xs font-medium">
              {activeCount} Active
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Role: {ROLE_METADATA[role].label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Create and revoke Personal Access Tokens to authenticate scripts, webhooks, and
            integrations with your AssetsVista workspace as{" "}
            <span className="font-medium text-foreground">
              {dbUser?.email || "your account"}
            </span>
            .
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create New Token
        </Button>
      </div>

      {/* Main Two-Column Snipe-IT Inspired Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Personal Access Tokens Manager */}
        <div className="xl:col-span-8 space-y-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 sm:p-5 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
              <div className="flex items-center gap-1.5 rounded-lg border bg-background p-1 w-fit">
                {(
                  [
                    { id: "active", label: "Active" },
                    { id: "all", label: "All" },
                    { id: "inactive", label: "Revoked / Expired" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      statusFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search token name or prefix..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Token Table wrapped in Skullet Skeleton */}
            <Skeleton loading={isLoading}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Name</TableHead>
                      <TableHead>Token Prefix</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <SampleTableRows
                        columns={[
                          "text",
                          "mono",
                          "date",
                          "date",
                          "date",
                          "badge",
                          "actions",
                        ]}
                        rowCount={4}
                      />
                    ) : filteredKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 py-6">
                            <KeyRound className="h-8 w-8 text-muted-foreground/60" />
                            <p className="text-sm font-medium text-foreground">
                              {allKeys.length === 0
                                ? "No Personal Access Tokens yet"
                                : "No tokens match this filter"}
                            </p>
                            <p className="text-xs text-muted-foreground max-w-sm">
                              {allKeys.length === 0
                                ? "Generate a Personal Access Token to access AssetsVista REST endpoints over Bearer authentication."
                                : "Try switching filters or clearing your search query."}
                            </p>
                            {allKeys.length === 0 && (
                              <Button
                                size="sm"
                                className="mt-2 gap-1.5"
                                onClick={() => setCreateOpen(true)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Create New Token
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredKeys.map((token) => (
                        <TableRow key={token._id}>
                          <TableCell className="align-top">
                            <div className="font-medium text-sm text-foreground">
                              {token.name}
                            </div>
                            {token.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {token.notes}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <code className="inline-flex items-center rounded border bg-muted/50 px-2 py-0.5 font-mono text-xs text-foreground">
                              {token.keyPrefix}••••
                            </code>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top">
                            {format(new Date(token.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top">
                            {token.lastUsedAt ? (
                              <span title={new Date(token.lastUsedAt).toLocaleString()}>
                                {format(new Date(token.lastUsedAt), "MMM d, yyyy · HH:mm")}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground/70">Never used</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top">
                            {token.expiresAt ? (
                              format(new Date(token.expiresAt), "MMM d, yyyy")
                            ) : (
                              <span className="text-muted-foreground/80">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            {token.status === "active" && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">
                                Active
                              </Badge>
                            )}
                            {token.status === "expired" && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20">
                                Expired
                              </Badge>
                            )}
                            {token.status === "revoked" && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Revoked
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right align-top">
                            {token.status !== "revoked" ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() =>
                                  setRevokeTarget({ key: token, purge: false })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Revoke
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setRevokeTarget({ key: token, purge: true })
                                }
                              >
                                Remove
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Skeleton>
          </div>
        </div>

        {/* Right Column: Security Warning, API Endpoint & Reference Info */}
        <div className="xl:col-span-4 space-y-4">
          {/* One-Time Visibility Security Warning (Snipe-IT parity) */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              One-Time Token Visibility
            </div>
            <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
              When generating a Personal Access Token, be sure to copy it down
              immediately. AssetsVista stores only a SHA-256 cryptographic digest,
              so plaintext tokens can never be viewed again after creation.
            </p>
          </div>

          {/* API Base Endpoint & Authentication Guide */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">API Endpoint &amp; Authentication</h2>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Workspace API Base URL</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border bg-muted/50 px-2.5 py-1.5 font-mono text-xs">
                  {apiBaseUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="Copy API Base URL"
                  onClick={() => handleCopy(apiBaseUrl, "base-url", "API Base URL")}
                >
                  {copiedId === "base-url" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Authorization Header</Label>
              <pre className="rounded-md border bg-muted/40 p-2.5 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {`Authorization: Bearer av_<prefix>.<secret>\nAccept: application/json`}
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Quick Test Command</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => handleCopy(sampleCurlCommand, "curl-ref", "cURL command")}
                >
                  {copiedId === "curl-ref" ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy
                </Button>
              </div>
              <pre className="rounded-md border bg-muted/40 p-2.5 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                {sampleCurlCommand}
              </pre>
            </div>
          </div>

          {/* Expiration & Security Policy */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Expiration &amp; Security Policy</h2>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Tokens inherit your <strong className="text-foreground">{ROLE_METADATA[role].label}</strong>{" "}
                  RBAC permissions and workspace isolation automatically.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Choose lifetimes from <strong className="text-foreground">30 days</strong> up to{" "}
                  <strong className="text-foreground">20 years</strong> (matching Snipe-IT defaults)
                  or non-expiring service tokens.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Revoking a key takes effect immediately. API keys cannot create or
                  revoke other API keys.
                </span>
              </li>
            </ul>
          </div>

          {/* Key REST Endpoints Reference */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">REST API Reference</h2>
            <div className="divide-y">
              {ENDPOINT_REFERENCE.map((ep) => (
                <div key={ep.path} className="py-2 first:pt-0 last:pb-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                      {ep.method}
                    </Badge>
                    <code className="font-mono text-xs text-foreground">{ep.path}</code>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{ep.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Token Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Personal Access Token</DialogTitle>
            <DialogDescription>
              Give your token a clear name so you can identify which script or integration
              uses it later.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateToken} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="api-key-name">Token Name</Label>
              <Input
                id="api-key-name"
                autoFocus
                required
                maxLength={100}
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g. CMDB Sync, Warehouse Scanner"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api-key-expiration">Expiration</Label>
              <Select
                value={expirationPreset}
                onValueChange={(val) => setExpirationPreset(val as ApiKeyExpirationPreset)}
              >
                <SelectTrigger id="api-key-expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {API_KEY_EXPIRATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {
                  API_KEY_EXPIRATION_OPTIONS.find((o) => o.value === expirationPreset)
                    ?.description
                }
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api-key-notes">Notes (Optional)</Label>
              <Input
                id="api-key-notes"
                maxLength={300}
                value={tokenNotes}
                onChange={(e) => setTokenNotes(e.target.value)}
                placeholder="Where is this token stored or deployed?"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate Token
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* One-Time Personal Access Token Display Dialog */}
      <Dialog open={revealOpen} onOpenChange={handleCloseRevealModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-500" />
              Personal Access Token Created
              {revealedKeyName && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {revealedKeyName}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Here is your new Personal Access Token. This is the only time it will be
              shown, so do not lose it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Copy this secret immediately. Once you close this window, AssetsVista cannot
                recover or re-display the plaintext token.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Plaintext Bearer Token</Label>
              <div className="flex items-center gap-2">
                <pre className="flex-1 rounded-lg border bg-muted/60 px-3 py-2.5 font-mono text-xs overflow-x-auto select-all text-foreground">
                  <code>{revealedToken}</code>
                </pre>
                <Button
                  type="button"
                  onClick={() =>
                    handleCopy(revealedToken, "revealed-token", "Personal Access Token")
                  }
                  className="gap-1.5 shrink-0"
                >
                  {copiedId === "revealed-token" ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Verify Immediately with cURL
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() =>
                    handleCopy(
                      `curl -s "${apiBaseUrl}/core/asset" -H "Authorization: Bearer ${revealedToken}"`,
                      "revealed-curl",
                      "cURL verification snippet"
                    )
                  }
                >
                  {copiedId === "revealed-curl" ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy cURL
                </Button>
              </div>
              <pre className="rounded-lg border bg-muted/40 p-2.5 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                {`curl -s "${apiBaseUrl}/core/asset" \\\n  -H "Authorization: Bearer ${revealedToken}"`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => handleCloseRevealModal(false)}>
              Done — I&apos;ve Saved My Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke / Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open && !revoking) setRevokeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {revokeTarget?.purge ? "Remove Token History Record" : "Revoke API Token"}
            </DialogTitle>
            <DialogDescription>
              {revokeTarget?.purge ? (
                <>
                  Permanently remove the already-revoked record for{" "}
                  <strong className="text-foreground">{revokeTarget.key.name}</strong>?
                </>
              ) : (
                <>
                  Revoking <strong className="text-foreground">{revokeTarget?.key.name}</strong> (
                  <code className="font-mono text-xs">{revokeTarget?.key.keyPrefix}••••</code>)
                  immediately rejects any future API requests using this token. This action
                  cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={revoking}
              className="gap-2"
            >
              {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
              {revokeTarget?.purge ? "Remove Record" : "Revoke Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
