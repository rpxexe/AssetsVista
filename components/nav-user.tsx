"use client";

import React, { useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronsUpDown,
  ClipboardList,
  HardDriveUpload,
  LogOut,
  Settings,
  UserCog,
} from "lucide-react";

import { AccountSettingsDialog } from "@/components/AccountSettingsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_METADATA } from "@/lib/rbac";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { role, permissions, dbUser, person } = usePermissions();
  const queryClient = useQueryClient();
  const [accountOpen, setAccountOpen] = useState(false);

  if (!dbUser) return null;

  const email = dbUser.email || "";
  const displayName =
    dbUser.name ||
    person?.name ||
    (email ? email.split("@")[0] : "User");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const profileHref = person?._id
    ? `/people/${person._id}`
    : permissions.canViewPeople
    ? "/people"
    : "/admin";
  const roleLabel = ROLE_METADATA[role].label;

  const handleSignOut = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {
      // Proceed cleanly even if session cookie expired
    } finally {
      queryClient.clear();
      window.location.replace("/login");
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="flex-1 min-w-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarImage src={dbUser.picture} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 shrink-0" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={dbUser.picture} alt={displayName} />
                    <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{displayName}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {roleLabel}
                      </Badge>
                    </div>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {(person?._id || permissions.canViewPeople) && (
                  <Link href={profileHref}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Check />
                      View Assigned Assets
                    </DropdownMenuItem>
                  </Link>
                )}
                <Link href="/assets/listall?status=Requestable">
                  <DropdownMenuItem className="cursor-pointer">
                    <HardDriveUpload />
                    Requestable Assets
                  </DropdownMenuItem>
                </Link>
                <Link href="/requests">
                  <DropdownMenuItem className="cursor-pointer">
                    <ClipboardList />
                    {permissions.canFulfillRequests ? "Item Requests" : "My Requests"}
                  </DropdownMenuItem>
                </Link>
                {permissions.canViewReports && (
                  <Link href="/reports/activity">
                    <DropdownMenuItem className="cursor-pointer">
                      <BadgeCheck />
                      Activity History
                    </DropdownMenuItem>
                  </Link>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => setAccountOpen(true)}
                >
                  <UserCog />
                  Account &amp; Password Settings
                </DropdownMenuItem>
                {permissions.canManageSettings && (
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings />
                      Admin Settings
                    </DropdownMenuItem>
                  </Link>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />

              <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                <LogOut className="text-foreground" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Direct Settings Gear Icon in Profile Section */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {permissions.canManageSettings ? (
                  <Link
                    href="/settings"
                    className="group-data-[collapsible=icon]:hidden shrink-0"
                    aria-label="Admin Settings"
                  >
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                      <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setAccountOpen(true)}
                    className="h-9 w-9 rounded-lg group-data-[collapsible=icon]:hidden shrink-0"
                    aria-label="Account Settings"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>
                  {permissions.canManageSettings ? "Admin Settings" : "Account & Password Settings"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      </SidebarMenu>

      <AccountSettingsDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}
