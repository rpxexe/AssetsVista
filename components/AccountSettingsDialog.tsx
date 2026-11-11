"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";
import { ROLE_METADATA } from "@/lib/rbac";

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsDialog({
  open,
  onOpenChange,
}: AccountSettingsDialogProps) {
  const { dbUser, role } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && dbUser) {
      setName(dbUser.name || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open, dbUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast({
        title: "Invalid name",
        description: "Display name must be at least 2 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword || currentPassword) {
      if (!currentPassword) {
        toast({
          title: "Current password required",
          description: "Enter your current password to set a new password.",
          variant: "destructive",
        });
        return;
      }
      if (newPassword.length < 6) {
        toast({
          title: "Password too short",
          description: "New password must be at least 6 characters long.",
          variant: "destructive",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({
          title: "Passwords do not match",
          description: "Confirm password must match the new password.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await axios.patch("/api/auth/me", {
        name: name.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["current-auth-user"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
      ]);
      toast({
        title: "Account Updated",
        description: res.data?.message || "Your profile settings have been saved.",
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Update Failed",
        description: getClientErrorMessage(err, "Unable to update account settings."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-foreground" />
            Account &amp; Profile Settings
          </DialogTitle>
          <DialogDescription>
            Update your display name, password credentials, and review your active workspace role.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/35 p-3.5 text-xs">
          <div className="space-y-0.5 min-w-0">
            <p className="font-medium text-foreground truncate">{dbUser?.email}</p>
            <p className="text-muted-foreground">{ROLE_METADATA[role].description}</p>
          </div>
          <Badge variant="outline" className={ROLE_METADATA[role].badgeClass}>
            {ROLE_METADATA[role].label}
          </Badge>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Display Name *</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Change Password (Optional)</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswords((v) => !v)}
                className="h-7 px-2 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                {showPasswords ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Show
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-curr-pw">Current Password</Label>
              <Input
                id="acc-curr-pw"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="acc-new-pw">New Password</Label>
                <Input
                  id="acc-new-pw"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-confirm-pw">Confirm New Password</Label>
                <Input
                  id="acc-confirm-pw"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Role: {ROLE_METADATA[role].label}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

