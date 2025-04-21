"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Droplet, FilePieChart, Keyboard, LibraryBig, Microchip, Search, User } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  
} from "@/components/ui/navigation-menu";


export function NavigationMenuHeader() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="border ">
            Create New
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex flex-col justify-center p-2 md:w-[150px] lg:w-[150px]">
                              
              {/* <AssetForm/> */}
              <ListItem
                href="#"
                title="License"
                icon={<FilePieChart className="w-4 h-4" />}
              />
              <ListItem
                href="#"
                title="Accessory"
                icon={<Keyboard className="w-4 h-4" />}
              />
              <ListItem
                href="#"
                title="Consumable"
                icon={<Droplet className="w-4 h-4" />}
              />
              <ListItem
                href="#"
                title="Component"
                icon={<Microchip className="w-4 h-4" />}
              />
              <ListItem
                href="#"
                title="User"
                icon={<User className="w-4 h-4" />}
              />
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
>(({ className, title, children,icon, ...props }, ref) => {
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
