import React from "react";
import Link from "next/link";
import { Cog } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-sidebar px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Cog className="h-8 w-8 animate-spin-slow text-blue-600" strokeWidth={2.5} />
            <div>
              <h1 className="text-xl font-bold tracking-tight font-sans">
                AssetsVista Setup Wizard
              </h1>
              <p className="text-xs text-muted-foreground">
                First-time IT Asset Management Configuration
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                Back to Dashboard
              </Button>
            </Link>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 md:py-12">
        <SetupWizard />
      </main>
    </div>
  );
}

