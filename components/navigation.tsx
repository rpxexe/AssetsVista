"use client";

import * as React from "react";


import { cn } from "@/lib/utils";
import {
  Barcode,
  Droplets,
  FilePieChart,
  Keyboard,
  Microchip,
  Users,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,

} from "@/components/ui/navigation-menu";
import { usePermissions } from "@/hooks/usePermissions";


export function NavigationMenuHeader() {
  const { permissions } = usePermissions();

  if (!permissions.canCreateEditAssets && !permissions.canManagePeople) {
    return null;
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="border ">
            Create New
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex flex-col justify-center p-2 md:w-[170px] lg:w-[180px]">
              {permissions.canCreateEditAssets && (
                <>
                  <ListItem
                    href="/assets/listall?create=1"
                    title="Asset"
                    icon={<Barcode className="w-4 h-4" />}
                  />
                  <ListItem
                    href="/licenses?create=1"
                    title="License"
                    icon={<FilePieChart className="w-4 h-4" />}
                  />
                  <ListItem
                    href="/accessories?create=1"
                    title="Accessory"
                    icon={<Keyboard className="w-4 h-4" />}
                  />
                  <ListItem
                    href="/consumables?create=1"
                    title="Consumable"
                    icon={<Droplets className="w-4 h-4" />}
                  />
                  <ListItem
                    href="/components?create=1"
                    title="Component"
                    icon={<Microchip className="w-4 h-4" />}
                  />
                </>
              )}
              {permissions.canManagePeople && (
                <ListItem
                  href="/people?create=1"
                  title="Person"
                  icon={<Users className="w-4 h-4" />}
                />
              )}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & {
    icon?: React.ReactNode;
    title: string;
  }
>(({ className, title, icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-2 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center space-x-2">
            {icon}
            <span className="text-sm font-medium leading-none">{title}</span>
          </div>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
