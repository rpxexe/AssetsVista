"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Cable,
  Clock,
  Droplets,
  Factory,
  FileChartPie,
  FileText,
  History,
  Keyboard,
  LayoutPanelTop,
  LibraryBig,
  Loader2,
  MapPin,
  Microchip,
  Ratio,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { ElasticHit, ElasticSearchResponse, EntityType } from "@/lib/elasticSearch";

const RECENT_STORAGE_KEY = "assetsvista_recent_searches";

const TYPE_META: Record<
  EntityType,
  { label: string; plural: string; icon: React.ComponentType<{ className?: string }> }
> = {
  asset: { label: "Asset", plural: "Assets", icon: LibraryBig },
  person: { label: "Person", plural: "People", icon: User },
  license: { label: "License", plural: "Licenses", icon: FileChartPie },
  accessory: { label: "Accessory", plural: "Accessories", icon: Keyboard },
  component: { label: "Component", plural: "Components", icon: Microchip },
  consumable: { label: "Consumable", plural: "Consumables", icon: Droplets },
  setting: { label: "Directory", plural: "Directory & Settings", icon: Building2 },
};

const QUICK_NAV = [
  { label: "All Assets", href: "/assets/listall", icon: LibraryBig },
  { label: "People & Users", href: "/people", icon: Users },
  { label: "Software Licenses", href: "/licenses", icon: FileChartPie },
  { label: "Accessories", href: "/accessories", icon: Keyboard },
  { label: "Components", href: "/components", icon: Microchip },
  { label: "Consumables", href: "/consumables", icon: Droplets },
];

const QUICK_REPORTS_AND_SETTINGS = [
  { label: "Depreciation Report", href: "/reports/depreciation", icon: FileText },
  { label: "Maintenance & Audits", href: "/reports/maintenance", icon: Wrench },
  { label: "Activity History", href: "/reports/activity", icon: History },
  { label: "Companies", href: "/settings/company", icon: Building2 },
  { label: "Manufacturers", href: "/settings/manufacturer", icon: Factory },
  { label: "Asset Models", href: "/settings/assetmodel", icon: Ratio },
  { label: "Locations", href: "/settings/location", icon: MapPin },
  { label: "Departments", href: "/settings/department", icon: Users },
  { label: "Suppliers", href: "/settings/supplier", icon: Cable },
  { label: "Categories", href: "/settings/category", icon: LayoutPanelTop },
];

/**
 * Highlights matching query tokens inside hit text cleanly.
 */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const tokens = query
    .trim()
    .split(/[\s\-_.:/@]+/)
    .filter((t) => t.length >= 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (tokens.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${tokens.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, idx) =>
        tokens.some((t) => new RegExp(`^${t}$`, "i").test(part)) ? (
          <mark
            key={idx}
            className="bg-yellow-200/80 dark:bg-yellow-500/30 text-foreground font-semibold rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export function CommandDialogForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [activeType, setActiveType] = React.useState<EntityType | "all">("all");
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  // Load recent searches from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Global keyboard shortcuts: Cmd/Ctrl + J or Cmd/Ctrl + K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key.toLowerCase() === "j" || e.key.toLowerCase() === "k") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounce query input by 180ms before triggering cached TanStack search query
  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = null, isFetching: isLoading } = useQuery<ElasticSearchResponse>({
    queryKey: ["elastic-search", debouncedQuery, activeType],
    queryFn: async ({ signal }) => {
      const res = await axios.get<ElasticSearchResponse & { success: boolean }>("/api/search", {
        params: {
          q: debouncedQuery,
          type: activeType,
          limit: 30,
        },
        signal,
      });
      return res.data;
    },
    enabled: open && debouncedQuery.length > 0,
    staleTime: 1000 * 30, // Keep identical search hits warm for 30s
    placeholderData: keepPreviousData,
  });

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const updated = [clean, ...recentSearches.filter((r) => r !== clean)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage access errors
    }
  };

  const handleNavigate = (href: string, searchLabel?: string) => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
    } else if (searchLabel) {
      saveRecentSearch(searchLabel);
    }
    setOpen(false);
    router.push(href);
  };

  const handleSyncIndex = async () => {
    setIsSyncing(true);
    try {
      await axios.post("/api/search/sync");
      await queryClient.invalidateQueries({ queryKey: ["elastic-search"] });
    } catch (err) {
      console.error("Index sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Group hits by EntityType preserving relevance score order of first appearance
  const groupedHits = React.useMemo(() => {
    if (!results?.hits?.length) return [];
    const groups = new Map<EntityType, ElasticHit[]>();
    for (const hit of results.hits) {
      if (!groups.has(hit.type)) {
        groups.set(hit.type, []);
      }
      groups.get(hit.type)!.push(hit);
    }
    return Array.from(groups.entries());
  }, [results]);

  const totalFacetSum = React.useMemo(() => {
    if (!results?.facets) return 0;
    return Object.values(results.facets).reduce((sum, n) => sum + n, 0);
  }, [results]);

  return (
    <>
      <Button
        variant="outline"
        size="default"
        className="w-[300px] lg:w-[340px] flex justify-between items-center bg-background/80 hover:bg-accent/50 transition-colors"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 text-sm text-muted-foreground truncate">
          <Search className="h-4 w-4 shrink-0 text-blue-500" />
          Search in AssetsVista...
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
          <span>⌘</span>J
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        contentClassName="sm:max-w-2xl"
      >
        <div className="relative">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Elastic search assets, serials, tags, people, licenses..."
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveType("all");
              }}
              className="absolute right-10 top-3.5 text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Elastic Facet Type Filter Bar */}
        {query.trim().length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b overflow-x-auto bg-muted/30">
            <button
              type="button"
              onClick={() => setActiveType("all")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeType === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border hover:bg-accent text-muted-foreground"
              }`}
            >
              All {results ? `(${totalFacetSum})` : ""}
            </button>
            {(Object.keys(TYPE_META) as EntityType[]).map((t) => {
              const count = results?.facets?.[t] ?? 0;
              if (results && count === 0 && activeType !== t) return null;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveType(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeType === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {TYPE_META[t].plural} {results ? `(${count})` : ""}
                </button>
              );
            })}
          </div>
        )}

        <CommandList className="max-h-[420px]">
          {/* Active Search Results */}
          {query.trim().length > 0 ? (
            isLoading && !results ? (
              <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                Searching across inventory...
              </div>
            ) : groupedHits.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-medium text-foreground">
                  No matches found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground">
                  Try searching by Asset Tag, Serial Number, Employee Name, Email, or License Key.
                </p>
              </div>
            ) : (
              groupedHits.map(([type, hits]) => {
                const meta = TYPE_META[type];
                const GroupIcon = meta.icon;
                return (
                  <CommandGroup key={type} heading={`${meta.plural} (${hits.length})`}>
                    {hits.map((hit) => (
                      <CommandItem
                        key={`${hit.type}-${hit.id}`}
                        value={`${hit.type}-${hit.id}-${hit.title}`}
                        onSelect={() => handleNavigate(hit.href)}
                        className="flex items-center justify-between gap-3 py-2.5 cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <GroupIcon className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                <HighlightText text={hit.title} query={query} />
                              </span>
                              {hit.tag && (
                                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                  <HighlightText text={hit.tag} query={query} />
                                </Badge>
                              )}
                              {hit.matchType === "fuzzy" && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  <Sparkles className="h-2.5 w-2.5" /> Fuzzy
                                </span>
                              )}
                            </div>
                            {hit.subtitle && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                <HighlightText text={hit.subtitle} query={query} />
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hit.badge && (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {hit.badge}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })
            )
          ) : (
            /* Empty Search Query State: Recent Searches + Quick Navigation */
            <>
              {recentSearches.length > 0 && (
                <>
                  <CommandGroup heading="Recent Searches">
                    {recentSearches.map((term) => (
                      <CommandItem
                        key={term}
                        value={`recent-${term}`}
                        onSelect={() => setQuery(term)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{term}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">Search again</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              <CommandGroup heading="Core Inventory">
                {QUICK_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={item.label}
                      onSelect={() => handleNavigate(item.href)}
                      className="cursor-pointer"
                    >
                      <Icon className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Reports & Directory Settings">
                {QUICK_REPORTS_AND_SETTINGS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={item.label}
                      onSelect={() => handleNavigate(item.href)}
                      className="cursor-pointer"
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* Elastic Search Footer Telemetry */}
        <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            {results ? (
              <span>
                <strong>{results.totalHits}</strong> hit{results.totalHits === 1 ? "" : "s"} in{" "}
                <strong>{results.tookMs}ms</strong> ({results.engine})
              </span>
            ) : (
              <span>Elastic fuzzy multi-field search ready</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSyncIndex}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh / Sync search index"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Re-index"}
            </button>
            <span className="hidden sm:inline">↵ Select • Esc Close</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
