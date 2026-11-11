import React from "react";
import { redirect } from "next/navigation";
import { Cog, Database, Layers, ShieldCheck, Wrench } from "lucide-react";
import Login from "@/components/login";
import { ModeToggle } from "@/components/ModeToggle";
import { Badge } from "@/components/ui/badge";
import { getAuthenticatedActor, shouldRedirectToSetup } from "@/lib/serverAuth";

interface LoginPageProps {
  searchParams: Promise<{ redirect_url?: string; mode?: string }>;
}

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Role-Based Access (Admin, Assets User, Request User)",
    description:
      "Tailored dashboards and route permissions for admins, IT asset operators, and item requesters.",
  },
  {
    icon: Layers,
    title: "Full Lifecycle Inventory & Self-Service Requests",
    description:
      "Manage assets, seats, accessories & consumables while requesters browse & request items cleanly.",
  },
  {
    icon: Wrench,
    title: "Audits, Maintenances & Acceptances",
    description: "Track due audits, repairs, EULA sign-offs, and assigned hardware per user.",
  },
  {
    icon: Database,
    title: "Bring Your Own MongoDB",
    description: "Run pre-flight checks and connect your own cluster from the Setup Wizard.",
  },
];

function sanitizeRedirectPath(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.startsWith("/login") &&
    !raw.startsWith("/sign-in") &&
    !raw.startsWith("/sign-up")
  ) {
    return raw;
  }
  return undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const safeRedirect = sanitizeRedirectPath(query?.redirect_url);
  const initialMode = query?.mode === "sign-up" ? "sign-up" : "sign-in";

  const actor = await getAuthenticatedActor();
  if (actor && actor.dbUser.isActive) {
    if (!safeRedirect && (await shouldRedirectToSetup(actor.userId))) {
      redirect("/setup");
    }
    redirect(safeRedirect || "/admin");
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid grid-cols-1 lg:grid-cols-12">
      {/* Left Brand & Architecture Panel */}
      <aside className="hidden lg:flex lg:col-span-6 flex-col justify-between p-12 border-r bg-muted/25">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card shadow-sm">
            <Cog className="h-5 w-5 animate-spin-slow text-foreground" strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">AssetsVista</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              ITAM
            </Badge>
          </div>
        </div>

        <div className="max-w-lg space-y-8 my-auto py-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Precision hardware, license &amp; team asset control.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open-source enterprise asset tracking with built-in role-based access control, clean
              workspace isolation, and zero third-party auth lock-in.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-start gap-3.5 rounded-2xl border bg-card/80 p-4"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/60">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold leading-none">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>AssetsVista Open-Source Platform</span>
          <span>Built-in RBAC Sessions</span>
        </div>
      </aside>

      {/* Right Auth Column */}
      <main className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-10">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-card">
              <Cog className="h-4 w-4 animate-spin-slow" />
            </div>
            <span className="font-bold text-lg tracking-tight">AssetsVista</span>
          </div>
          <ModeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center py-6">
          <div className="w-full max-w-md rounded-[2em] border bg-card p-6 sm:p-8 shadow-sm">
            <Login initialRedirectUrl={safeRedirect} initialMode={initialMode} />
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Protected routes &amp; role-isolated workspaces per organization.
        </p>
      </main>
    </div>
  );
}
