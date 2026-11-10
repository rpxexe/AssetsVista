"use client";

import {
  BadgeCheck,
  Check,
  ChevronsUpDown,
  HardDriveUpload,
  LogOut,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { SignedIn, SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Persist & sync authenticated user data to MongoDB (`users` & `peoples` collections) once per session
  const { data: synced } = useQuery({
    queryKey: ["current-db-user", user?.id],
    queryFn: async () => {
      const res = await axios.post("/api/users/sync");
      const payload = res.data?.data;
      if (payload?.isNewPerson || payload?.isNewUser) {
        queryClient.invalidateQueries({ queryKey: ["people"] });
        queryClient.invalidateQueries({ queryKey: ["counttotals"] });
      }
      return payload as {
        user?: { _id: string; name?: string; role?: string; email?: string };
        person?: { _id: string; name?: string };
      };
    },
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 15, // Sync every 15 minutes max unless invalidated
    gcTime: 1000 * 60 * 30,
  });

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress || "";
  const displayName =
    synced?.user?.name ||
    user.fullName ||
    user.username ||
    (email ? email.split("@")[0] : "User");
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const profileHref = synced?.person?._id ? `/people/${synced.person._id}` : "/people";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.imageUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
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
                  <AvatarImage src={user.imageUrl} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold">{displayName}</span>
                    {synced?.user?.role && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                        {synced.user.role}
                      </Badge>
                    )}
                  </div>
                  <span className="truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href={profileHref}>
                <DropdownMenuItem className="cursor-pointer">
                  <Check />
                  View Assigned Assets
                </DropdownMenuItem>
              </Link>
              <Link href="/assets/listall?status=Requestable">
                <DropdownMenuItem className="cursor-pointer">
                  <HardDriveUpload />
                  Requestable Assets
                </DropdownMenuItem>
              </Link>
              <Link href="/reports/activity">
                <DropdownMenuItem className="cursor-pointer">
                  <BadgeCheck />
                  Activity History
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer">
              <LogOut color="red" />
              <SignedIn>
                <SignOutButton />
              </SignedIn>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
