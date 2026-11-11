"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { forgetShapes } from "skullet";
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClientErrorMessage } from "@/lib/errorMessages";

function sanitizeRedirectUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.startsWith("/login") &&
    !raw.startsWith("/sign-in") &&
    !raw.startsWith("/sign-up")
  ) {
    return raw;
  }
  return null;
}

export default function Login({
  initialRedirectUrl,
  initialMode = "sign-in",
}: {
  initialRedirectUrl?: string;
  initialMode?: "sign-in" | "sign-up";
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);

  // Form states
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
  }, [initialMode]);

  const requestedRedirect = useMemo(() => {
    if (initialRedirectUrl) return sanitizeRedirectUrl(initialRedirectUrl);
    if (typeof window !== "undefined") {
      const qs = new URLSearchParams(window.location.search).get("redirect_url");
      return sanitizeRedirectUrl(qs);
    }
    return null;
  }, [initialRedirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (mode === "sign-up") {
      if (name.trim().length < 2) {
        setErrorMsg("Please enter your full name (at least 2 characters).");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    } else if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === "sign-in" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "sign-in"
          ? { email: cleanEmail, password, redirectTo: requestedRedirect }
          : {
              name: name.trim(),
              workspaceName: workspaceName.trim() || undefined,
              email: cleanEmail,
              password,
            };

      const res = await axios.post(endpoint, payload);
      forgetShapes();
      queryClient.clear();

      const nextUrl = res.data?.data?.redirectTo || requestedRedirect || "/admin";
      window.location.replace(nextUrl);
    } catch (err) {
      setErrorMsg(
        getClientErrorMessage(
          err,
          mode === "sign-in"
            ? "Invalid email or password."
            : "Unable to create your account."
        )
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === "sign-in" ? "Sign in to AssetsVista" : "Create your workspace"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {mode === "sign-in"
            ? "Access your Admin, Assets User, or Request User dashboard."
            : "Create a new Admin workspace or activate your invited team email."}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("sign-in");
            setErrorMsg(null);
          }}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === "sign-in"
              ? "bg-background text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sign-up");
            setErrorMsg(null);
          }}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === "sign-up"
              ? "bg-background text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Create Account
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "sign-up" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="auth-name">Full Name *</Label>
              <Input
                id="auth-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="auth-org">Organization / Workspace Name (Optional)</Label>
              <Input
                id="auth-org"
                type="text"
                placeholder="Acme IT Operations"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={submitting}
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="auth-email">Email Address *</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Password *</Label>
          <div className="relative">
            <Input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              placeholder={mode === "sign-up" ? "At least 6 characters" : "Enter password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mode === "sign-up" && (
          <div className="space-y-1.5">
            <Label htmlFor="auth-confirm">Confirm Password *</Label>
            <Input
              id="auth-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
        )}

        <Button type="submit" className="w-full gap-2" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "sign-in" ? (
            <KeyRound className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {submitting
            ? mode === "sign-in"
              ? "Signing in..."
              : "Creating workspace..."
            : mode === "sign-in"
            ? "Sign In"
            : "Create Account"}
        </Button>
      </form>

      <div className="rounded-xl border bg-muted/40 px-3.5 py-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-foreground" />
        <span>
          New sign-ups create an isolated <strong>Admin</strong> workspace and launch the Setup
          Wizard. Team <strong>Assets Users</strong> and <strong>Request Users</strong> added by an
          Admin sign in here with their assigned email &amp; password.
        </span>
      </div>
    </div>
  );
}
