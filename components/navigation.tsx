"use client";

import * as React from "react";
import Link from "next/link";
import {
  Barcode,
  ChevronDown,
  Droplets,
  FilePieChart,
  Keyboard,
  Microchip,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";

export function NavigationMenuHeader() {
  const { permissions } = usePermissions();

  if (!permissions.canCreateEditAssets && !permissions.canManagePeople) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="group h-9 px-3.5 gap-1.5 font-medium"
        >
          <span>Create New</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px] p-1.5">
        {permissions.canCreateEditAssets && (
          <>
            <DropdownMenuItem asChild className="cursor-pointer py-2 px-2.5">
              <Link href="/assets/listall?create=1" className="flex items-center gap-2.5">
                <Barcode className="w-4 h-4" />
                <span className="font-medium">Asset</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer py-2 px-2.5">
              <Link href="/licenses?create=1" className="flex items-center gap-2.5">
                <FilePieChart className="w-4 h-4" />
                <span className="font-medium">License</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer py-2 px-2.5">
              <Link href="/accessories?create=1" className="flex items-center gap-2.5">
                <Keyboard className="w-4 h-4" />
                <span className="font-medium">Accessory</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer py-2 px-2.5">
              <Link href="/consumables?create=1" className="flex items-center gap-2.5">
                <Droplets className="w-4 h-4" />
                <span className="font-medium">Consumable</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer py-2 px-2.5">
              <Link href="/components?create=1" className="flex items-center gap-2.5">
                <Microchip className="w-4 h-4" />
                <span className="font-medium">Component</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {permissions.canManagePeople && (
          <DropdownMenuItem asChild className="cursor-pointer py-2 px-2.5">
            <Link href="/people?create=1" className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span className="font-medium">Person</span>
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
