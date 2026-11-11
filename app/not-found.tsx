import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Cog,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  LibraryBig,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotFoundBackButton } from "@/components/NotFoundBackButton";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6 sm:p-10">
      {/* Subtle monochrome top bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link href="/admin" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card">
            <Cog className="h-5 w-5 animate-spin-slow text-foreground" strokeWidth={2.2} />
          </div>
          <span className="font-bold text-lg tracking-tight">AssetsVista</span>
        </Link>
        <Badge variant="outline" className="font-mono text-xs px-3 py-1">
          HTTP 404
        </Badge>
      </header>

      {/* Center card */}
      <main className="flex-1 flex items-center justify-center py-10">
        <div className="max-w-2xl w-full border rounded-[2.5em] bg-card p-8 sm:p-12 shadow-sm">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/60 px-3.5 py-1 text-xs font-medium text-muted-foreground">
              <FileSearch className="h-3.5 w-3.5 text-foreground" />
              <span>Route Not Found</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4 select-none">
                <span className="text-7xl sm:text-8xl font-extrabold tracking-tighter tabular-nums">
                  4
                </span>
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 bg-muted/40">
                  <Cog
                    className="h-9 w-9 sm:h-11 sm:w-11 animate-spin-slow text-foreground"
                    strokeWidth={2}
                  />
                </div>
                <span className="text-7xl sm:text-8xl font-extrabold tracking-tighter tabular-nums">
                  4
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight pt-2">
                Page not found
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                The page, asset link, or endpoint you requested doesn&apos;t exist, was moved, or is
                no longer available in this workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/admin">
                <Button className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/assets/listall">
                <Button variant="outline" className="gap-2">
                  <LibraryBig className="h-4 w-4" />
                  Browse Assets
                </Button>
              </Link>
              <NotFoundBackButton />
            </div>

            <div className="w-full border-t pt-6 mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Quick destinations
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                <Link
                  href="/maintenances"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Maintenances
                </Link>
                <Link
                  href="/calendar"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Calendar
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Monochrome footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-muted-foreground">
        AssetsVista IT Asset Management
      </footer>
    </div>
  );
}

