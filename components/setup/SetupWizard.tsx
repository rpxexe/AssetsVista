"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Cog,
  Database,
  Globe,
  Layers,
  LibraryBig,
  Loader2,
  MapPin,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  settings?: any;
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

const STEPS = [
  { id: 1, title: "Pre-Flight Check", subtitle: "Verify server & database", icon: Server },
  { id: 2, title: "Organization", subtitle: "Company & seed defaults", icon: Building2 },
  { id: 3, title: "Site Settings", subtitle: "Branding, currency & tags", icon: Globe },
  { id: 4, title: "Admin & Launch", subtitle: "Account & final review", icon: UserCheck },
];

const CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$", label: "USD ($) — US Dollar" },
  { code: "INR", symbol: "₹", label: "INR (₹) — Indian Rupee" },
  { code: "EUR", symbol: "€", label: "EUR (€) — Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) — British Pound" },
  { code: "CAD", symbol: "C$", label: "CAD (C$) — Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD (A$) — Australian Dollar" },
];

const STATUS_BADGE_PREVIEWS = [
  "Ready to Deploy",
  "Deployed",
  "CheckedOut",
  "Pending",
  "Undeployed",
  "Archived",
  "Requestable",
];

const CATEGORY_PREVIEWS = [
  "Laptops",
  "Desktops",
  "Monitors",
  "Mobile Devices",
  "Software Licenses",
  "Keyboards & Mice",
  "Memory & Storage",
  "Office Consumables",
];

export function SetupWizard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [checkingPreflight, setCheckingPreflight] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<SetupStatusResponse | null>(null);

  // Step 2: Organization & Inventory Defaults
  const [companyName, setCompanyName] = useState("My Organization");
  const [companyEmail, setCompanyEmail] = useState("it@organization.com");
  const [locationName, setLocationName] = useState("Headquarters");
  const [locationAddress, setLocationAddress] = useState("Main Campus");
  const [locationCity, setLocationCity] = useState("San Francisco");
  const [locationState, setLocationState] = useState("CA");
  const [departmentName, setDepartmentName] = useState("IT & Engineering");
  const [departmentPhone, setDepartmentPhone] = useState("+1-555-0100");
  const [seedDefaultStatuses, setSeedDefaultStatuses] = useState(true);
  const [seedDefaultCategories, setSeedDefaultCategories] = useState(true);
  const [seedSampleCatalog, setSeedSampleCatalog] = useState(true);
  const [seedDemoData, setSeedDemoData] = useState(false);

  // Step 3: Site & System Preferences
  const [siteName, setSiteName] = useState("AssetsVista");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [defaultCurrency, setDefaultCurrency] = useState("$");
  const [autoIncrementPrefix, setAutoIncrementPrefix] = useState("AST-");
  const [autoIncrementAssets, setAutoIncrementAssets] = useState(true);
  const [auditIntervalMonths, setAuditIntervalMonths] = useState(12);
  const [defaultEulaText, setDefaultEulaText] = useState(
    "I acknowledge receipt of the company-owned equipment listed above in good working order. I agree to take reasonable care of these assets and return them upon termination of employment or upon request by IT."
  );

  // Step 4: Admin User Profile
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminTitle, setAdminTitle] = useState("IT Administrator");
  const [employeeNum, setEmployeeNum] = useState("EMP-001");

  const runPreflightCheck = useCallback(async () => {
    setCheckingPreflight(true);
    try {
      const res = await axios.get<SetupStatusResponse>("/api/setup/status");
      setStatusData(res.data);

      // Populate existing site settings if revisiting setup wizard
      if (res.data?.settings) {
        const s = res.data.settings;
        if (s.site_name) setSiteName(s.site_name);
        if (s.currency_code) setCurrencyCode(s.currency_code);
        if (s.default_currency) setDefaultCurrency(s.default_currency);
        if (s.auto_increment_prefix) setAutoIncrementPrefix(s.auto_increment_prefix);
        if (s.audit_interval_months) setAuditIntervalMonths(s.audit_interval_months);
        if (s.default_eula_text) setDefaultEulaText(s.default_eula_text);
      }
    } catch (err) {
      console.error("Failed preflight diagnostics:", err);
    } finally {
      setCheckingPreflight(false);
    }
  }, []);

  useEffect(() => {
    runPreflightCheck();
  }, [runPreflightCheck]);

  // Pre-fill admin fields from Clerk session when loaded
  useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress || "";
      setAdminFirstName((prev) => prev || user.firstName || "");
      setAdminLastName((prev) => prev || user.lastName || "");
      setAdminEmail((prev) => prev || email);
      setAdminUsername(
        (prev) =>
          prev || user.username || (email ? email.split("@")[0].toLowerCase() : "admin")
      );
      if (email && companyEmail === "it@organization.com") {
        const domain = email.split("@")[1];
        if (domain && !["gmail.com", "outlook.com", "yahoo.com"].includes(domain)) {
          setCompanyEmail(`it@${domain}`);
        } else {
          setCompanyEmail(email);
        }
      }
    }
  }, [isLoaded, user, companyEmail]);

  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code);
    const match = CURRENCY_OPTIONS.find((c) => c.code === code);
    if (match) setDefaultCurrency(match.symbol);
  };

  const canProceedStep2 =
    companyName.trim().length >= 2 &&
    companyEmail.trim().includes("@") &&
    locationName.trim().length >= 2 &&
    departmentName.trim().length >= 2;

  const canSubmitFinal =
    (adminEmail.trim().length > 0 || companyEmail.trim().length > 0) &&
    siteName.trim().length >= 2;

  const handleCompleteSetup = async () => {
    setSubmitError(null);

    const targetEmail = (adminEmail || companyEmail).trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      const msg = "Please enter a valid administrator or company email address before launching.";
      setSubmitError(msg);
      toast({
        title: "Invalid Email Address",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    if (!siteName.trim() || siteName.trim().length < 2) {
      const msg = "Site / Portal Name must be at least 2 characters long.";
      setSubmitError(msg);
      toast({
        title: "Invalid Site Name",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const fullName =
        [adminFirstName, adminLastName].filter(Boolean).join(" ").trim() ||
        user?.fullName ||
        "System Administrator";

      const response = await axios.post("/api/setup", {
        companyName,
        companyEmail,
        locationName,
        locationAddress,
        locationCity,
        locationState,
        departmentName,
        departmentPhone,
        seedDefaultStatuses,
        seedDefaultCategories,
        seedSampleCatalog,
        seedDemoData,
        siteName,
        defaultCurrency,
        currencyCode,
        autoIncrementPrefix,
        autoIncrementAssets,
        auditIntervalMonths,
        defaultEulaText,
        alertEmail: adminEmail || companyEmail,
        adminName: fullName,
        adminFirstName,
        adminLastName,
        adminEmail: adminEmail || companyEmail,
        adminUsername,
        adminTitle,
        employeeNum,
        clerkId: user?.id || "",
      });

      await queryClient.invalidateQueries();
      toast({
        title: "Setup Complete",
        description: response.data.message || "Your AssetsVista workspace is ready.",
      });
      setCompleted(true);
    } catch (err: any) {
      const friendlyMessage = getClientErrorMessage(
        err,
        "Could not complete initial setup. Please review your details and try again."
      );
      setSubmitError(friendlyMessage);
      toast({
        title: "Setup Could Not Complete",
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <Card className="max-w-2xl mx-auto shadow-lg border-green-500/30">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-3">
            <Rocket className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {siteName} is Ready to Launch!
          </CardTitle>
          <CardDescription className="text-base">
            Your workspace, organization hierarchy, default status labels, categories, and
            administrator profile have been configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 p-4 rounded-lg border text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="font-semibold">{companyName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Primary Location</p>
              <p className="font-semibold">
                {locationName} {locationCity ? `(${locationCity})` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Primary Department</p>
              <p className="font-semibold">{departmentName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Asset Tag Prefix & Currency</p>
              <p className="font-semibold">
                {autoIncrementPrefix} • {currencyCode} ({defaultCurrency})
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-3 pt-2">
          <Button size="lg" onClick={() => router.push("/admin")} className="gap-2">
            <Rocket className="h-4 w-4" />
            Go to Dashboard
          </Button>
          <Link href="/assets/listall">
            <Button variant="outline" size="lg" className="gap-2">
              <LibraryBig className="h-4 w-4" />
              Add First Asset
            </Button>
          </Link>
          <Link href="/people">
            <Button variant="outline" size="lg" className="gap-2">
              <Users className="h-4 w-4" />
              Manage People
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stepper Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id < step || statusData?.preflight?.database?.ok) {
                  setStep(s.id);
                }
              }}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 shadow-sm"
                  : isDone
                  ? "border-green-500/40 bg-green-50/40 dark:bg-green-950/20"
                  : "bg-card text-muted-foreground opacity-80"
              }`}
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isDone
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">
                  {s.id}. {s.title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{s.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Step Card */}
      <Card className="shadow-md">
        {step === 1 && (
          <>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    Step 1: Pre-Flight System & Database Check
                  </CardTitle>
                  <CardDescription>
                    Verify MongoDB connectivity, authentication, search indexing, and existing
                    reference data before configuring your instance.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runPreflightCheck}
                  disabled={checkingPreflight}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${checkingPreflight ? "animate-spin" : ""}`} />
                  Re-check
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {checkingPreflight ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm">Running system diagnostics...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {statusData?.preflight &&
                      Object.entries(statusData.preflight).map(([key, item]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            {item.ok ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.detail}</p>
                            </div>
                          </div>
                          <Badge variant={item.ok ? "default" : "destructive"}>
                            {item.ok ? "PASS" : "ISSUE"}
                          </Badge>
                        </div>
                      ))}
                  </div>

                  {statusData?.counts && (
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5" /> Current Database Inventory Baseline
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-1">
                        <div>
                          <span className="text-muted-foreground">Companies:</span>{" "}
                          <strong>{statusData.counts.companies}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Locations:</span>{" "}
                          <strong>{statusData.counts.locations}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status Labels:</span>{" "}
                          <strong>{statusData.counts.statuses}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Categories:</span>{" "}
                          <strong>{statusData.counts.categories}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  Skip Setup &rarr;
                </Button>
              </Link>
              <Button
                onClick={() => setStep(2)}
                disabled={checkingPreflight || !statusData?.preflight?.database?.ok}
                className="gap-2"
              >
                Next: Organization Setup
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Step 2: Organization & Inventory Seed Defaults
              </CardTitle>
              <CardDescription>
                Create your primary company, physical office location, and seed standard Snipe-IT
                status labels and categories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Company & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">IT / Support Email *</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="it@acme.com"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> Primary Location & Department
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="locationName">Location Name *</Label>
                    <Input
                      id="locationName"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Headquarters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationCity">City</Label>
                    <Input
                      id="locationCity"
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                      placeholder="San Francisco"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationState">State / Region</Label>
                    <Input
                      id="locationState"
                      value={locationState}
                      onChange={(e) => setLocationState(e.target.value)}
                      placeholder="CA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="locationAddress">Street Address</Label>
                    <Input
                      id="locationAddress"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="100 Main St"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departmentName">Primary Department *</Label>
                    <Input
                      id="departmentName"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      placeholder="IT & Engineering"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departmentPhone">Department Phone</Label>
                    <Input
                      id="departmentPhone"
                      value={departmentPhone}
                      onChange={(e) => setDepartmentPhone(e.target.value)}
                      placeholder="+1-555-0100"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* One-Click Snipe-IT Seeding Options */}
              <div className="space-y-4">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-muted-foreground" /> Seed Standard IT Asset
                  Taxonomy
                </p>

                <div className="p-4 rounded-lg border space-y-3 bg-muted/20">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="seedStatuses"
                      checked={seedDefaultStatuses}
                      onCheckedChange={(v) => setSeedDefaultStatuses(Boolean(v))}
                    />
                    <div className="space-y-1.5 leading-none">
                      <label htmlFor="seedStatuses" className="text-sm font-medium cursor-pointer">
                        Create Snipe-IT Standard Status Labels (Recommended)
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {STATUS_BADGE_PREVIEWS.map((st) => (
                          <Badge key={st} variant="secondary" className="text-[11px] font-normal">
                            {st}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border space-y-3 bg-muted/20">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="seedCategories"
                      checked={seedDefaultCategories}
                      onCheckedChange={(v) => setSeedDefaultCategories(Boolean(v))}
                    />
                    <div className="space-y-1.5 leading-none">
                      <label
                        htmlFor="seedCategories"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Create Standard Hardware, Software & Accessory Categories
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {CATEGORY_PREVIEWS.map((cat) => (
                          <Badge key={cat} variant="outline" className="text-[11px] font-normal">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="seedCatalog"
                      checked={seedSampleCatalog}
                      onCheckedChange={(v) => setSeedSampleCatalog(Boolean(v))}
                    />
                    <div className="space-y-1 leading-none">
                      <label htmlFor="seedCatalog" className="text-sm font-medium cursor-pointer">
                        Include Starter Catalog (Apple, Dell, CDW Direct, MacBook Pro 14 M3)
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Helpful for adding your first assets immediately without configuring
                        manufacturers & suppliers from scratch.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="seedDemoData"
                      checked={seedDemoData}
                      onCheckedChange={(v) => setSeedDemoData(Boolean(v))}
                    />
                    <div className="space-y-1 leading-none">
                      <label htmlFor="seedDemoData" className="text-sm font-medium cursor-pointer">
                        Populate Demo Inventory Across All Collections
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Adds sample assets, software licenses, accessories, components, consumables,
                        people profiles, and activity logs isolated to your workspace.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Unable to complete setup</p>
                      <p className="text-xs leading-relaxed opacity-90">{submitError}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSubmitError(null)}
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="gap-2">
                Next: Site Settings
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Cog className="h-5 w-5 text-blue-600" />
                Step 3: Site Branding, Tags & Security Policies
              </CardTitle>
              <CardDescription>
                Configure your organization&apos;s naming conventions, default currency, audit
                cycles, and employee sign-off EULA text.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site / Portal Name *</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="AssetsVista"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tagPrefix">Asset Tag Prefix</Label>
                  <Input
                    id="tagPrefix"
                    value={autoIncrementPrefix}
                    onChange={(e) => setAutoIncrementPrefix(e.target.value)}
                    placeholder="AST-"
                  />
                  <p className="text-xs text-muted-foreground">
                    Example generated tags: {autoIncrementPrefix}1001, {autoIncrementPrefix}1002
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auditMonths">Physical Audit Cycle (Months)</Label>
                  <Input
                    id="auditMonths"
                    type="number"
                    min={1}
                    max={60}
                    value={auditIntervalMonths}
                    onChange={(e) => setAuditIntervalMonths(Number(e.target.value) || 12)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Assets flag as Due for Audit every {auditIntervalMonths} months.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="autoInc"
                  checked={autoIncrementAssets}
                  onCheckedChange={(v) => setAutoIncrementAssets(Boolean(v))}
                />
                <label htmlFor="autoInc" className="text-sm font-medium cursor-pointer">
                  Enable Auto-Incrementing Asset Tags by default
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eula">Default Equipment Acceptance EULA</Label>
                <textarea
                  id="eula"
                  rows={4}
                  value={defaultEulaText}
                  onChange={(e) => setDefaultEulaText(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground">
                  Shown on printable Employee Equipment Sign-Off sheets during asset handoffs.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(4)} className="gap-2">
                Next: Admin Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {step === 4 && (
          <>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                Step 4: Administrator Profile & Launch
              </CardTitle>
              <CardDescription>
                Verify your Superadmin profile and review the provisioning summary before finalizing
                setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminFirst">First Name</Label>
                  <Input
                    id="adminFirst"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    placeholder="Alex"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminLast">Last Name</Label>
                  <Input
                    id="adminLast"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    placeholder="Morgan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Administrator Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminUsername">Username</Label>
                  <Input
                    id="adminUsername"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="alex.morgan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminTitle">Job Title</Label>
                  <Input
                    id="adminTitle"
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="IT Director"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empNum">Employee Number</Label>
                  <Input
                    id="empNum"
                    value={employeeNum}
                    onChange={(e) => setEmployeeNum(e.target.value)}
                    placeholder="EMP-001"
                  />
                </div>
              </div>

              <Separator />

              {/* Review Summary */}
              <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Provisioning Review Summary
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portal Name:</span>
                    <span className="font-medium">{siteName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company:</span>
                    <span className="font-medium">{companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location & Dept:</span>
                    <span className="font-medium">
                      {locationName} / {departmentName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Currency & Tag Prefix:</span>
                    <span className="font-medium">
                      {currencyCode} ({defaultCurrency}) / {autoIncrementPrefix}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seed Statuses & Categories:</span>
                    <span className="font-medium">
                      {seedDefaultStatuses ? "7 Statuses" : "Skipped"},{" "}
                      {seedDefaultCategories ? "8 Categories" : "Skipped"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Starter Catalog:</span>
                    <span className="font-medium">
                      {seedSampleCatalog ? "Apple, Dell, CDW, MacBook M3" : "Skipped"}
                    </span>
                  </div>
                </div>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Unable to complete setup</p>
                      <p className="text-xs leading-relaxed opacity-90">{submitError}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSubmitError(null)}
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleCompleteSetup}
                disabled={submitting || !canSubmitFinal}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Configuration...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Complete Setup & Launch
                  </>
                )}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

