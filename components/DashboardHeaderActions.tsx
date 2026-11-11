"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  ClipboardList,
  Droplets,
  FileChartPie,
  HardDriveUpload,
  Keyboard,
  Laptop,
  LibraryBig,
  Microchip,
  Plus,
  Settings,
  Users,
} from "lucide-react";

import { AccountSettingsDialog } from "@/components/AccountSettingsDialog";
import { AlertBellMenu } from "@/components/dashboard/AlertBellMenu";
import { CommandDialogForm } from "@/components/Form";
import { ModeToggle } from "@/components/ModeToggle";
import { NavigationMenuHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissions } from "@/hooks/usePermissions";

export function DashboardHeaderActions() {
  const { permissions, isLoading, dbUser, person } = usePermissions();
  const [accountOpen, setAccountOpen] = useState(false);

  const enforced = !isLoading && Boolean(dbUser);
  const isRequester = enforced && !permissions.canCreateEditAssets;

  const settingsTrigger = (
    <Tooltip>
      <TooltipTrigger asChild>
        {permissions.canManageSettings ? (
          <Link href="/settings" aria-label="Admin Settings">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setAccountOpen(true)}
            aria-label="Account Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>{permissions.canManageSettings ? "Admin Settings" : "Account & Password Settings"}</p>
      </TooltipContent>
    </Tooltip>
  );

  if (isRequester) {
    return (
      <>
        <div className="w-full h-20 flex items-center justify-between px-4 gap-3">
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/assets/listall?status=Requestable">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <HardDriveUpload className="h-4 w-4" />
                      <span className="hidden sm:inline">Requestable Catalog</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Browse Requestable Items</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/requests">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ClipboardList className="h-4 w-4" />
                      <span className="hidden sm:inline">My Requests</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View My Requests</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/acceptances">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ClipboardCheck className="h-4 w-4" />
                      <span className="hidden md:inline">Acceptances</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pending EULA Acceptances</p>
                </TooltipContent>
              </Tooltip>

              {person?._id && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/people/${person._id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Laptop className="h-4 w-4" />
                        <span className="hidden lg:inline">My Assets</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View My Assigned Equipment</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link href="/requests?create=1">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Request Item
                </Button>
              </Link>
              <ModeToggle />
              {settingsTrigger}
            </div>
          </TooltipProvider>
        </div>

        <AccountSettingsDialog open={accountOpen} onOpenChange={setAccountOpen} />
      </>
    );
  }

  return (
    <>
      <div className="w-full h-20 flex items-center justify-end pr-3">
        <div className="w-1/3 flex justify-evenly items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/assets/listall">
                  <Button className="p-3" variant="outline">
                    <LibraryBig />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assets</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/licenses">
                  <Button className="p-3" variant="outline">
                    <FileChartPie />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Licenses</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/accessories">
                  <Button className="p-3" variant="outline">
                    <Keyboard />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Accessories</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/consumables">
                  <Button className="p-3" variant="outline">
                    <Droplets />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Consumables</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/components">
                  <Button className="p-3" variant="outline">
                    <Microchip />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Components</p>
              </TooltipContent>
            </Tooltip>

            {(!enforced || permissions.canViewPeople) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/people">
                    <Button className="p-3" variant="outline">
                      <Users />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>People</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
        <div className="w-1/3 flex justify-center items-center">
          <CommandDialogForm />
        </div>
        <div className="w-1/3 flex justify-end items-center gap-2">
          <NavigationMenuHeader />
          <AlertBellMenu />
          <ModeToggle />
          <TooltipProvider>{settingsTrigger}</TooltipProvider>
        </div>
      </div>

      <AccountSettingsDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}
