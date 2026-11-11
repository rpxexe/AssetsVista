import { redirect } from "next/navigation";
import { Cog } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeaderActions } from "@/components/DashboardHeaderActions";
import { RouteAccessGuard } from "@/components/RouteAccessGuard";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getAuthenticatedActor, shouldRedirectToSetup } from "@/lib/serverAuth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const actor = await getAuthenticatedActor();
  if (!actor) {
    redirect("/login");
  }

  if (actor.dbUser.isActive && (await shouldRedirectToSetup(actor.userId))) {
    redirect("/setup");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-20 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-20 bg-sidebar">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <DashboardHeaderActions />
        </header>
        <hr className="shrink-0" />
        <div className="flex-1 w-full min-w-0 font-sans pt-2 text-sidebar-foreground">
          <RouteAccessGuard>{children}</RouteAccessGuard>
        </div>
        <hr className="mt-auto shrink-0" />
        <footer className="shrink-0 bg-sidebar">
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
  );
}
