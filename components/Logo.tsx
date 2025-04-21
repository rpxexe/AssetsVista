"use client";

import * as React from "react";
import { Cog } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DropdownMenuSeparator } from "./ui/dropdown-menu";


export function TeamSwitcher() {

  

  return (
    <SidebarMenu className="mt-3">
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <a href="/admin">
            <div className="flex justify-start gap-1 items-center flex-1 text-left text-sm leading-tight">
              <Cog className="size-8 animate-spin-slow" />
              <span className="truncate font-semibold text-[1.3rem] font-poppins">
                AssetsVista
              </span>
            </div>
          </a>
        </SidebarMenuButton>
        <DropdownMenuSeparator />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
