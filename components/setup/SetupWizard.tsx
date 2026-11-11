"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Layers,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";

interface PreflightItem {
  ok: boolean;
  label: string;
  detail: string;
}

interface SetupStatusResponse {
  success: boolean;
  setup_completed: boolean;
  settings?: {
    site_name?: string;
    default_currency?: string;
    currency_code?: string;
  } | null;
  counts?: {
    companies: number;
    locations: number;
    departments: number;
    statuses: number;
    categories: number;
    people: number;
    assets: number;
  };
  preflight?: Record<string, PreflightItem>;
}

interface MongoTestResult {
  connected: boolean;
  pingMs: number;
  databaseName: string;
  collectionsCount: number;
  collections: string[];
  maskedHost: string;
  envSnippet?: string;
}

const MONGO_STEPS = [
  {
    step: "01",
    title: "Create a MongoDB Cluster or Local Server",
    detail:
      "Sign in to MongoDB Atlas (atlas.mongodb.com) and create a free M0 Shared Cluster (or install MongoDB Community Server locally on port 27017).",
  },
  {
    step: "02",
    title: "Create a Database User & Password",
    detail:
      "Under Database Access, create a username/password with Read and write to any database. If your password contains @, :, /, or %, URL-encode those characters.",
  },
  {
    step: "03",
    title: "Allow Network Access (IP Allowlist)",
    detail:
      "Under Network Access in Atlas, add your local server IP address — or 0.0.0.0/0 if deploying to serverless platforms such as Vercel.",
  },
  {
    step: "04",
    title: "Copy Your Connection String",
    detail:
      "Click Connect -> Drivers -> Node.js and copy the SRV URI, e.g. mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/assetsvista?retryWrites=true&w=majority",
  },
  {
    step: "05",
    title: "Test & Save MONGODB_URI",
    detail:
      "Paste the URI in Section 2 above to test latency & collection health. Click Save to .env.local on self-hosted instances, or paste MONGODB_URI into your cloud host's Environment Variables and redeploy.",
  },
  {
    step: "06",
    title: "Initialize Clean Indexes & Standard Status Labels",
    detail:
      "Optionally click Initialize Standard Status Labels & Categories below. Every new account starts with clean empty inventory tables (0 demo assets/people) isolated to your workspace.",
  },
];

export function SetupWizard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [checkingPreflight, setCheckingPreflight] = useState(true);
  const [statusData, setStatusData] = useState<SetupStatusResponse | null>(null);

  // First-time workspace setup state
  const [siteName, setSiteName] = useState("AssetsVista");
  const [defaultCurrency, setDefaultCurrency] = useState("$");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [initDefaultsOnComplete, setInitDefaultsOnComplete] = useState(true);
  const [completingSetup, setCompletingSetup] = useState(false);

  // Bring-your-own MongoDB form state
  const [mongodbUri, setMongodbUri] = useState("");
  const [dbName, setDbName] = useState("assetsvista");
  const [showUri, setShowUri] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);
  const [initializingDefaults, setInitializingDefaults] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<MongoTestResult | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const runPreflightCheck = useCallback(async () => {
    setCheckingPreflight(true);
    try {
      const res = await axios.get<SetupStatusResponse>("/api/setup/status");
      setStatusData(res.data);
      if (res.data?.settings?.site_name) setSiteName(res.data.settings.site_name);
      if (res.data?.settings?.default_currency) {
        setDefaultCurrency(res.data.settings.default_currency);
      }
      if (res.data?.settings?.currency_code) setCurrencyCode(res.data.settings.currency_code);
    } catch {
      setStatusData(null);
    } finally {
      setCheckingPreflight(false);
    }
  }, []);

  useEffect(() => {
    runPreflightCheck();
  }, [runPreflightCheck]);

  const handleTestMongo = async () => {
    setDbError(null);
    if (!mongodbUri.trim()) {
      setDbError("Please enter a MongoDB connection URI first.");
      return;
    }

    setTestingDb(true);
    try {
      const res = await axios.post("/api/setup/mongodb", {
        action: "test",
        mongodbUri: mongodbUri.trim(),
        dbName: dbName.trim(),
      });
      setTestResult(res.data.data);
      toast({
        title: "MongoDB Connected",
        description: res.data.message,
      });
    } catch (err) {
      const msg = getClientErrorMessage(err, "Unable to connect to MongoDB.");
      setDbError(msg);
      setTestResult(null);
      toast({
        title: "Connection Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setTestingDb(false);
    }
  };

  const handleSaveEnv = async () => {
    setDbError(null);
    if (!mongodbUri.trim()) {
      setDbError("Please enter a MongoDB connection URI before saving.");
      return;
    }

    setSavingEnv(true);
    try {
      const res = await axios.post("/api/setup/mongodb", {
        action: "save-env",
        mongodbUri: mongodbUri.trim(),
        dbName: dbName.trim(),
      });
      setTestResult(res.data.data);
      toast({
        title: res.data.saved ? "Saved to .env.local" : "Connection Verified",
        description: res.data.message,
      });
      runPreflightCheck();
    } catch (err) {
      const msg = getClientErrorMessage(err, "Unable to save MongoDB configuration.");
      setDbError(msg);
      toast({
        title: "Save Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSavingEnv(false);
    }
  };

  const handleInitDefaults = async () => {
    setInitializingDefaults(true);
    try {
      const res = await axios.post("/api/setup/mongodb", {
        action: "init-defaults",
      });
      await queryClient.invalidateQueries();
      await runPreflightCheck();
      toast({
        title: "Workspace Initialized",
        description: res.data.message,
      });
    } catch (err) {
      const msg = getClientErrorMessage(err, "Could not initialize defaults.");
      toast({
        title: "Initialization Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setInitializingDefaults(false);
    }
  };

  const handleCompleteSetup = async (withDefaults: boolean) => {
    setCompletingSetup(true);
    try {
      const res = await axios.post("/api/setup/mongodb", {
        action: "complete-setup",
        initDefaults: withDefaults,
        siteName: siteName.trim() || "AssetsVista",
        defaultCurrency: defaultCurrency.trim() || "$",
        currencyCode: currencyCode.trim() || "USD",
      });
      await queryClient.invalidateQueries();
      toast({
        title: "Workspace Ready",
        description: res.data?.message || "Setup finished. Opening your dashboard...",
      });
      window.location.replace("/admin");
    } catch (err) {
      const msg = getClientErrorMessage(err, "Unable to complete workspace setup.");
      toast({
        title: "Setup Failed",
        description: msg,
        variant: "destructive",
      });
      setCompletingSetup(false);
    }
  };

  const handleCopySnippet = async () => {
    const snippet =
      testResult?.envSnippet ||
      (mongodbUri.trim() ? `MONGODB_URI="${mongodbUri.trim()}"` : 'MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/assetsvista"');
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Copy the MONGODB_URI string manually from the input field.",
        variant: "destructive",
      });
    }
  };

  const preflightItems = statusData?.preflight ? Object.values(statusData.preflight) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* First-Time Onboarding / Workspace Completion Banner */}
      {!checkingPreflight && statusData && !statusData.setup_completed ? (
        <Card className="rounded-[1.75em] border-foreground/20">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[11px]">
                  First-Time Workspace Setup
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Clean empty workspace detected
                </span>
              </div>
              <CardTitle className="text-xl">
                Welcome to AssetsVista — Configure Your Workspace
              </CardTitle>
              <CardDescription>
                Review system pre-flight diagnostics below, optionally point AssetsVista to your
                own MongoDB cluster, or launch your workspace right away with clean empty tables.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 space-y-1.5">
                <Label htmlFor="setup-site-name">Organization / Site Name</Label>
                <Input
                  id="setup-site-name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Acme IT Operations"
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="setup-currency-symbol">Currency Symbol</Label>
                <Input
                  id="setup-currency-symbol"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  placeholder="$"
                  maxLength={6}
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="setup-currency-code">Currency Code</Label>
                <Input
                  id="setup-currency-code"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  placeholder="USD"
                  maxLength={8}
                  className="uppercase font-mono"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2.5 rounded-xl border bg-muted/30 px-4 py-3">
              <Checkbox
                id="setup-init-defaults"
                checked={initDefaultsOnComplete}
                onCheckedChange={(checked) => setInitDefaultsOnComplete(Boolean(checked))}
              />
              <Label htmlFor="setup-init-defaults" className="text-xs font-normal cursor-pointer">
                Initialize standard Asset Status labels (Ready to Deploy, Deployed, Pending,
                Archived) &amp; Categories (keeps Assets, People &amp; Licenses tables at 0).
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={completingSetup}
              onClick={() => handleCompleteSetup(false)}
            >
              Skip Setup &amp; Go to Empty Dashboard
            </Button>
            <Button
              type="button"
              disabled={completingSetup}
              onClick={() => handleCompleteSetup(initDefaultsOnComplete)}
              className="gap-2"
            >
              {completingSetup ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {completingSetup ? "Finalizing Workspace..." : "Complete Setup & Open Dashboard"}
            </Button>
          </CardFooter>
        </Card>
      ) : !checkingPreflight && statusData?.setup_completed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5em] border bg-card px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-foreground" />
            <span className="text-sm font-medium">Workspace setup is complete.</span>
            <Badge variant="secondary" className="text-[11px]">
              Ready
            </Badge>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-1.5">
              Back to Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      ) : null}

      {/* 1. Snipe-IT Style Pre-Flight Environment Check */}
      <Card className="rounded-[1.75em]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-foreground" />
              <CardTitle className="text-xl">Step 1: Snipe-IT Pre-Flight Environment Check</CardTitle>
            </div>
            <CardDescription>
              Verify active database connectivity, environment configuration, and isolated workspace readiness.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runPreflightCheck}
            disabled={checkingPreflight}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkingPreflight ? "animate-spin" : ""}`} />
            Re-run Checks
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Setting / Detail</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkingPreflight && preflightItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Checking environment...
                    </TableCell>
                  </TableRow>
                ) : preflightItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                      Unable to load pre-flight diagnostics.
                    </TableCell>
                  </TableRow>
                ) : (
                  preflightItems.map((item) => (
                    <TableRow key={item.label}>
                      <TableCell className="text-xs font-medium">{item.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {item.detail}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.ok ? "secondary" : "destructive"} className="text-[11px]">
                          {item.ok ? "OK" : "Action Needed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {statusData?.counts && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Layers className="h-4 w-4 text-foreground" />
                <span>Current Workspace Tables:</span>
                <Badge variant="outline">Assets: {statusData.counts.assets}</Badge>
                <Badge variant="outline">People: {statusData.counts.people}</Badge>
                <Badge variant="outline">Statuses: {statusData.counts.statuses}</Badge>
                <Badge variant="outline">Categories: {statusData.counts.categories}</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleInitDefaults}
                disabled={initializingDefaults}
                className="gap-1.5 text-xs"
              >
                {initializingDefaults ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Initialize Standard Statuses &amp; Categories
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Configure & Test Your Own MongoDB */}
      <Card className="rounded-[1.75em]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-foreground" />
            <CardTitle className="text-xl">Step 2: Set Up &amp; Test Your Own MongoDB</CardTitle>
          </div>
          <CardDescription>
            Connect AssetsVista to your own MongoDB Atlas cluster or self-hosted MongoDB instance. Connection strings are tested directly without logging passwords.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-1.5">
              <Label htmlFor="mongo-uri">MongoDB Connection URI (MONGODB_URI) *</Label>
              <div className="relative">
                <Input
                  id="mongo-uri"
                  type={showUri ? "text" : "password"}
                  value={mongodbUri}
                  onChange={(e) => setMongodbUri(e.target.value)}
                  placeholder="mongodb+srv://dbuser:password@cluster0.mongodb.net/assetsvista?retryWrites=true&w=majority"
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowUri((v) => !v)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label={showUri ? "Hide URI" : "Show URI"}
                >
                  {showUri ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Note: Special characters inside your password (like <code>@</code>, <code>:</code>, <code>/</code>, <code>#</code>) must be URL-encoded.
              </p>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <Label htmlFor="mongo-db">Database Name (Optional Override)</Label>
              <Input
                id="mongo-db"
                type="text"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                placeholder="assetsvista"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {dbError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{dbError}</span>
            </div>
          )}

          {testResult && (
            <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-foreground" />
                  <span>Connection Verified ({testResult.pingMs}ms)</span>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {testResult.maskedHost}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                <span>
                  Database: <strong className="text-foreground">{testResult.databaseName}</strong>
                </span>
                <span>
                  Existing Collections:{" "}
                  <strong className="text-foreground">{testResult.collectionsCount}</strong>
                </span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestMongo}
              disabled={testingDb || savingEnv}
              className="gap-2"
            >
              {testingDb ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="h-4 w-4" />
              )}
              Test Connection
            </Button>
            <Button
              type="button"
              onClick={handleSaveEnv}
              disabled={testingDb || savingEnv}
              className="gap-2"
            >
              {savingEnv ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Verify &amp; Save to .env.local
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopySnippet}
              className="gap-1.5 text-xs"
            >
              {copiedEnv ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedEnv ? "Copied" : "Copy Env Variable"}
            </Button>
          </div>

          {statusData?.setup_completed ? (
            <Link href="/admin">
              <Button variant="outline" size="sm" className="gap-1.5">
                Go to Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={completingSetup}
              onClick={() => handleCompleteSetup(initDefaultsOnComplete)}
              className="gap-1.5"
            >
              {completingSetup ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              Complete Setup &amp; Go to Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* 3. Written Step-by-Step Guide */}
      <Card className="rounded-[1.75em]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-foreground" />
            <CardTitle className="text-xl">Step-by-Step Guide: Setting Up Your Own MongoDB</CardTitle>
          </div>
          <CardDescription>
            Follow these steps to connect your own MongoDB Atlas or self-hosted database cleanly with zero pre-populated demo data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MONGO_STEPS.map((item) => (
              <div key={item.step} className="rounded-xl border bg-background p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[11px]">
                    Step {item.step}
                  </Badge>
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SetupWizard;
