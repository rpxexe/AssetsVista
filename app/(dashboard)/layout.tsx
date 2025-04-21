import { AppSidebar } from "@/components/app-sidebar";
import { CommandDialogForm } from "@/components/Form";
import { ModeToggle } from "@/components/ModeToggle";
import { NavigationMenuHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Cog,
  Droplets,
  FileChartPie,
  Keyboard,
  LibraryBig,
  Microchip,
} from "lucide-react";
import Link from "next/link";
import QueryClientProviderWrapper from "../providers/queryClientProvider";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-20 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-20 bg-sidebar">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </div>
            <div className="w-full h-20 flex items-center justify-end">
              <div className="w-1/3 flex justify-evenly items-center ">
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
                      <Link href="#">
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
                      <Link href="#">
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
                      <Link href="#">
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
                      <Link href="#">
                        <Button className="p-3" variant="outline">
                          <Microchip />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Components</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="w-1/3 flex justify-center items-center">
                <CommandDialogForm />
              </div>
              <div className="w-1/3 flex justify-evenly items-center">
                <NavigationMenuHeader />

                <ModeToggle />
              </div>
            </div>
          </header>
          <hr />
          <main className="font-poppins pt-2 text-sidebar-foreground">
            <QueryClientProviderWrapper>{children}</QueryClientProviderWrapper>
          </main>
          <hr />
          <footer className="bg-sidebar">
            <div className="w-full h-16 flex items-center justify-start p-5 gap-1 text-sm">
              <Cog className="w-5 h-5 animate-spin-slow" />
              <Link href="/admin" className="underline">
                AssetsVista
              </Link>
              <code> is open source software, made with ♥ by </code>
              <Link href="#" className="underline">
                @AssetsVista
              </Link>
            </div>
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
