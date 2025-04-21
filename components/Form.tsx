"use client";

import * as React from "react";
import {
  Building2,
  Cable,
  Calculator,
  Calendar,
  CreditCard,
  Droplets,
  Factory,
  FileChartPie,
  Keyboard,
  LayoutPanelTop,
  LibraryBig,
  MapPin,
  Microchip,
  PieChart,
  Ratio,
  Settings,
  Smile,
  User,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function CommandDialogForm() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="default"
        className="w-[300px] flex justify-between"
        onClick={()=>{setOpen(true)}}
      >
        <p className="text-md text-muted-foreground">Search in AssetsVista </p>
        <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[12px] font-medium text-muted-foreground opacity-100">
          <span className="text-sm">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <LibraryBig/>
              <span>Assets</span>
            </CommandItem>
            <CommandItem>
              <FileChartPie />
              <span>Licenses</span>
            </CommandItem>
            <CommandItem>
              <Keyboard />
              <span>Accessories</span>
            </CommandItem>
            <CommandItem>
              <Microchip />
              <span>Components</span>
            </CommandItem>
            <CommandItem>
              <Droplets />
              <span>Consumables</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              <Building2 />
              <span>Company</span>
            </CommandItem>
            <CommandItem>
              <Factory />
              <span>Manufacturers</span>
              
            </CommandItem>
            <CommandItem>
              <Ratio />
              <span>Asset Model</span>
              
            </CommandItem>
            <CommandItem>
              <MapPin />
              <span>Location</span>
              
            </CommandItem>
            <CommandItem>
              <Users />
              <span>Department</span>
              
            </CommandItem>
            <CommandItem>
              <Cable />
              <span>Suppliers</span>
              
            </CommandItem>
            <CommandItem>
              <LayoutPanelTop />
              <span>Categories</span>
              
            </CommandItem>
            
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
