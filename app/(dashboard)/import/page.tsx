"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Skeleton } from "skullet/react";

import { SampleTableRows } from "@/components/skeletons/AppSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { getClientErrorMessage } from "@/lib/errorMessages";
import { exportToCsv } from "@/lib/exportData";
import {
  autoMapSpreadsheetHeaders,
  buildSampleTemplateData,
  IMPORT_ENTITY_LIST,
  IMPORT_ENTITY_SCHEMAS,
  ImportEntityType,
} from "@/lib/importSchemas";

type WizardStep = 1 | 2 | 3 | 4;

interface ParsedSheetData {
  headers: string[];
  rows: Record<string, string | number | boolean | null>[];
}

interface RowSimulationResult {
  rowNumber: number;
  identifier: string;
  action: "create" | "update" | "skip" | "error";
  summary: string;
  errors: string[];
  notes: string[];
  raw: Record<string, string | number | boolean | null | undefined>;
}

interface ImportApiResponse {
  mode: "dry_run" | "commit";
  entityType: ImportEntityType;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  autoCreatedTaxonomy: string[];
  rows: RowSimulationResult[];
}

interface ImportJobHistoryItem {
  _id: string;
  actorName: string;
  filename: string;
  fileFormat: "csv" | "xlsx" | "xls";
  entityType: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  autoCreatedTaxonomy?: string[];
  createdAt: string;
}

const SKIP_FIELD_VALUE = "__skip__";

function extractSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string
): ParsedSheetData {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };

  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (matrix.length === 0) return { headers: [], rows: [] };

  const rawHeaders = (matrix[0] || []).map((cell, idx) => {
    const clean = String(cell ?? "").replace(/^\uFEFF/, "").trim();
    return clean || `Column ${idx + 1}`;
  });

  const rows: Record<string, string | number | boolean | null>[] = [];
  for (let r = 1; r < matrix.length; r += 1) {
    const rowArr = matrix[r] || [];
    const hasAnyValue = rowArr.some(
      (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""
    );
    if (!hasAnyValue) continue;

    const record: Record<string, string | number | boolean | null> = {};
    rawHeaders.forEach((h, cIdx) => {
      const val = rowArr[cIdx];
      record[h] = val === undefined ? "" : val;
    });
    rows.push(record);
  }

  return { headers: rawHeaders, rows };
}

export default function SmartImportPage() {
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [entityType, setEntityType] = useState<ImportEntityType>("asset");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [preserveBlanks, setPreserveBlanks] = useState(true);
  const [autoCreateTaxonomy, setAutoCreateTaxonomy] = useState(true);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [filename, setFilename] = useState("");
  const [fileFormat, setFileFormat] = useState<"csv" | "xlsx" | "xls">("csv");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");

  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string | number | boolean | null>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "errors" | "skipped">("all");
  const [simulating, setSimulating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<ImportApiResponse | null>(null);
  const [commitResult, setCommitResult] = useState<ImportApiResponse | null>(null);

  const activeSchema = IMPORT_ENTITY_SCHEMAS[entityType];

  const { data: history = [], isLoading: historyLoading } = useQuery<ImportJobHistoryItem[]>({
    queryKey: ["import-history"],
    queryFn: async () => {
      const res = await axios.get("/api/import");
      return res.data?.data || [];
    },
  });

  const applyParsedWorkbook = useCallback(
    (wb: XLSX.WorkBook, sheetName: string, targetEntity: ImportEntityType) => {
      const parsed = extractSheetRows(wb, sheetName);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setColumnMap(autoMapSpreadsheetHeaders(parsed.headers, targetEntity));
      setDryRunResult(null);
      setCommitResult(null);
    },
    []
  );

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      toast({
        title: "Unsupported file format",
        description: "Please upload a .csv, .xlsx, or .xls spreadsheet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error("No readable worksheet found in file.");
      }

      const firstSheet = wb.SheetNames[0];
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setSelectedSheet(firstSheet);
      setFilename(file.name);
      setFileFormat(ext === "xlsx" || ext === "xls" ? ext : "csv");
      applyParsedWorkbook(wb, firstSheet, entityType);

      toast({
        title: "Spreadsheet loaded",
        description: `Parsed "${file.name}" (${wb.SheetNames.length} worksheet${
          wb.SheetNames.length > 1 ? "s" : ""
        }).`,
      });
    } catch (error) {
      toast({
        title: "Could not read file",
        description: getClientErrorMessage(error, "Invalid spreadsheet file."),
        variant: "destructive",
      });
    }
  };

  const handleEntityChange = (nextType: ImportEntityType) => {
    setEntityType(nextType);
    if (headers.length > 0) {
      setColumnMap(autoMapSpreadsheetHeaders(headers, nextType));
    }
    setDryRunResult(null);
    setCommitResult(null);
  };

  const handleSheetChange = (nextSheet: string) => {
    setSelectedSheet(nextSheet);
    if (workbook) {
      applyParsedWorkbook(workbook, nextSheet, entityType);
    }
  };

  const handleDownloadTemplate = (formatKind: "csv" | "xlsx") => {
    const { headers: tplHeaders, rows: tplRows } = buildSampleTemplateData(entityType);
    if (formatKind === "csv") {
      exportToCsv(`assetsvista_${entityType}_template`, tplHeaders, tplRows);
      return;
    }

    const ws = XLSX.utils.aoa_to_sheet([tplHeaders, ...tplRows]);
    ws["!cols"] = tplHeaders.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeSchema.label);
    XLSX.writeFile(wb, `assetsvista_${entityType}_template.xlsx`);
  };

  const mappedTargets = useMemo(() => {
    return new Set(Object.values(columnMap).filter(Boolean));
  }, [columnMap]);

  const missingRequiredFields = useMemo(() => {
    return activeSchema.fields.filter((f) => f.required && !mappedTargets.has(f.key));
  }, [activeSchema.fields, mappedTargets]);

  const buildMappedRows = useCallback(() => {
    return rawRows.map((row) => {
      const mapped: Record<string, string | number | boolean | null> = {};
      for (const h of headers) {
        const targetKey = columnMap[h];
        if (targetKey) {
          mapped[targetKey] = row[h] ?? "";
        }
      }
      return mapped;
    });
  }, [rawRows, headers, columnMap]);

  const runDryRunSimulation = async () => {
    const mappedRows = buildMappedRows();
    if (mappedRows.length === 0) {
      toast({
        title: "No rows found",
        description: "Upload a non-empty spreadsheet before running pre-flight check.",
        variant: "destructive",
      });
      return;
    }

    setSimulating(true);
    setDryRunResult(null);
    setStep(3);
    try {
      const res = await axios.post("/api/import", {
        entityType,
        mode: "dry_run",
        updateExisting,
        preserveBlanks,
        autoCreateTaxonomy,
        filename,
        fileFormat,
        rows: mappedRows,
      });
      setDryRunResult(res.data?.data ?? null);
      setPreviewFilter("all");
    } catch (error) {
      toast({
        title: "Pre-flight check failed",
        description: getClientErrorMessage(error, "Unable to validate rows."),
        variant: "destructive",
      });
      setStep(2);
    } finally {
      setSimulating(false);
    }
  };

  const handleCommitImport = async () => {
    const mappedRows = buildMappedRows();
    if (mappedRows.length === 0) return;

    setCommitting(true);
    try {
      const res = await axios.post("/api/import", {
        entityType,
        mode: "commit",
        updateExisting,
        preserveBlanks,
        autoCreateTaxonomy,
        skipInvalidRows,
        filename,
        fileFormat,
        rows: mappedRows,
      });

      const resultData: ImportApiResponse | undefined = res.data?.data;
      setCommitResult(resultData ?? null);
      setStep(4);

      toast({
        title: `Import Complete: ${activeSchema.pluralLabel}`,
        description: `${resultData?.createdCount ?? 0} created, ${
          resultData?.updatedCount ?? 0
        } updated, ${resultData?.errorCount ?? 0} failed.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["import-history"] }),
        queryClient.invalidateQueries({ queryKey: ["assets"] }),
        queryClient.invalidateQueries({ queryKey: ["asset-sidebar-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["people-sidebar-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["licenses"] }),
        queryClient.invalidateQueries({ queryKey: ["accessories"] }),
        queryClient.invalidateQueries({ queryKey: ["consumables"] }),
        queryClient.invalidateQueries({ queryKey: ["components"] }),
        queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    } catch (error) {
      toast({
        title: "Import commit failed",
        description: getClientErrorMessage(error, "Could not commit imported records."),
        variant: "destructive",
      });
    } finally {
      setCommitting(false);
    }
  };

  const handleExportFailedRows = (rows: RowSimulationResult[]) => {
    const errored = rows.filter((r) => r.action === "error");
    if (errored.length === 0) return;
    const keys = activeSchema.fields.map((f) => f.key);
    const csvHeaders = ["Row #", "Error(s)", ...activeSchema.fields.map((f) => f.label)];
    const csvRows = errored.map((r) => [
      r.rowNumber,
      r.errors.join(" | "),
      ...keys.map((k) => r.raw?.[k] ?? ""),
    ]);
    exportToCsv(`failed_import_${entityType}_rows`, csvHeaders, csvRows);
  };

  const handleResetWizard = () => {
    setStep(1);
    setFilename("");
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setHeaders([]);
    setRawRows([]);
    setColumnMap({});
    setDryRunResult(null);
    setCommitResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await axios.delete(`/api/import?id=${id}`);
      await queryClient.invalidateQueries({ queryKey: ["import-history"] });
      toast({ title: "Import log deleted" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: getClientErrorMessage(error, "Could not remove import history log."),
        variant: "destructive",
      });
    }
  };

  const filteredPreviewRows = useMemo(() => {
    const rows = dryRunResult?.rows ?? [];
    if (previewFilter === "all") return rows;
    if (previewFilter === "errors") return rows.filter((r) => r.action === "error");
    if (previewFilter === "skipped") return rows.filter((r) => r.action === "skip");
    return rows.filter((r) => r.action === "create" || r.action === "update");
  }, [dryRunResult, previewFilter]);

  const validCommitCount =
    (dryRunResult?.createdCount ?? 0) + (dryRunResult?.updatedCount ?? 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="border rounded-[2.5em] p-5 bg-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/40">
            <CloudUpload className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Smart Data Importer
              </h1>
              <Badge variant="outline" className="text-xs">
                CSV &amp; Excel (.xlsx / .xls)
              </Badge>
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                Dry-Run Verified
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload spreadsheets, auto-map columns, simulate validation &amp; taxonomy
              resolution cleanly before writing to MongoDB.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {(
            [
              { n: 1, label: "Upload" },
              { n: 2, label: "Map" },
              { n: 3, label: "Dry Run" },
              { n: 4, label: "Complete" },
            ] as const
          ).map((s, idx) => (
            <React.Fragment key={s.n}>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 border font-medium ${
                  step === s.n
                    ? "bg-primary text-primary-foreground border-primary"
                    : step > s.n
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground"
                }`}
              >
                <span>{s.n}.</span>
                <span>{s.label}</span>
              </div>
              {idx < 3 && <span className="text-muted-foreground">/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: Entity Type + Dropzone + Templates */}
      {step === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-5">
            {/* Entity Picker */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  1. Select What You Want to Import
                </Label>
                <span className="text-xs text-muted-foreground">
                  Upsert key: <strong>{activeSchema.matchKeyLabel}</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {IMPORT_ENTITY_LIST.map((schema) => {
                  const allowed = permissions[schema.permissionKey];
                  const selected = entityType === schema.type;
                  return (
                    <button
                      key={schema.type}
                      type="button"
                      disabled={!allowed}
                      onClick={() => handleEntityChange(schema.type)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        !allowed
                          ? "opacity-50 cursor-not-allowed bg-muted/30"
                          : selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-sm">{schema.pluralLabel}</span>
                        {!allowed && (
                          <Badge variant="outline" className="text-[10px]">
                            Admin Only
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {schema.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File Dropzone */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <Label className="text-sm font-semibold">
                2. Upload CSV or Excel Workbook (.csv, .xlsx, .xls)
              </Label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const dropped = e.dataTransfer.files?.[0];
                  void handleFileSelected(dropped);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/60 hover:bg-muted/20"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => void handleFileSelected(e.target.files?.[0])}
                />
                <FileSpreadsheet className="h-9 w-9 mx-auto text-muted-foreground mb-2.5" />
                {filename ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {rawRows.length} data row(s) · {headers.length} column(s) · Click or drop
                      another file to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Drop your spreadsheet here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports direct Excel (.xlsx / .xls) &amp; UTF-8 CSV exports up to 2,000 rows
                    </p>
                  </div>
                )}
              </div>

              {sheetNames.length > 1 && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 gap-3">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">Multi-Sheet Excel Detected</p>
                    <p className="text-muted-foreground">
                      Select which worksheet tab contains your {activeSchema.pluralLabel} data.
                    </p>
                  </div>
                  <Select value={selectedSheet} onValueChange={handleSheetChange}>
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Import Behavior Toggles */}
              <div className="rounded-lg border p-4 space-y-3 bg-muted/15">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Import Strategy Options
                </p>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <Checkbox
                    checked={updateExisting}
                    onCheckedChange={(v) => setUpdateExisting(Boolean(v))}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-foreground">
                      Update existing {activeSchema.pluralLabel}
                    </span>
                    <p className="text-muted-foreground">
                      Matches existing records by <strong>{activeSchema.matchKeyLabel}</strong>{" "}
                      instead of skipping duplicates.
                    </p>
                  </div>
                </label>

                {updateExisting && (
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs pl-6">
                    <Checkbox
                      checked={preserveBlanks}
                      onCheckedChange={(v) => setPreserveBlanks(Boolean(v))}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-medium text-foreground">
                        Preserve existing DB values for blank cells
                      </span>
                      <p className="text-muted-foreground">
                        Blank cells in the spreadsheet leave existing database fields untouched.
                      </p>
                    </div>
                  </label>
                )}

                {activeSchema.supportsAutoTaxonomy && (
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <Checkbox
                      checked={autoCreateTaxonomy}
                      onCheckedChange={(v) => setAutoCreateTaxonomy(Boolean(v))}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-medium text-foreground">
                        Auto-create missing Categories, Locations, Statuses, Models, Suppliers &amp; Companies
                      </span>
                      <p className="text-muted-foreground">
                        Eliminates import failures when referenced taxonomy names do not exist yet;
                        dry-run previews every new record first.
                      </p>
                    </div>
                  </label>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={rawRows.length === 0 || headers.length === 0}
                  onClick={() => setStep(2)}
                  className="gap-2"
                >
                  Continue to Column Mapping
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Sample Templates + Snipe-IT Advantages */}
          <div className="xl:col-span-4 space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">
                  Sample Templates ({activeSchema.pluralLabel})
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Download a ready-to-fill starter template with pre-formatted columns and an
                example row for <strong>{activeSchema.pluralLabel}</strong>.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDownloadTemplate("csv")}
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDownloadTemplate("xlsx")}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                  Excel (.xlsx)
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-semibold">Why AssetsVista Importer Excels</h2>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li>
                  <strong className="text-foreground">Direct Excel + Multi-Sheet:</strong> Reads{" "}
                  <code>.xlsx</code> and <code>.xls</code> natively without CSV encoding corruption.
                </li>
                <li>
                  <strong className="text-foreground">Zero-Write Dry Run:</strong> Simulates every
                  row, duplicate, date/currency format, and new taxonomy before touching MongoDB.
                </li>
                <li>
                  <strong className="text-foreground">Download Failed Rows Only:</strong> Fix bad
                  rows in one exported CSV instead of re-checking huge files.
                </li>
                <li>
                  <strong className="text-foreground">Import-Time Checkout:</strong> Assign assets
                  directly to existing staff using <code>Checkout To Email / Username</code>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Smart Column Mapper */}
      {step === 2 && (
        <div className="rounded-xl border bg-card p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">
                Map Spreadsheet Columns &mdash; {activeSchema.pluralLabel}
              </h2>
              <p className="text-xs text-muted-foreground">
                Matched <strong>{mappedTargets.size}</strong> target field(s) across{" "}
                <strong>{headers.length}</strong> columns in <strong>{filename}</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setColumnMap(autoMapSpreadsheetHeaders(headers, entityType))}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Auto-Map Columns
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            </div>
          </div>

          {/* Required Fields Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground mr-1">Required for new inserts:</span>
            {activeSchema.fields
              .filter((f) => f.required)
              .map((f) => {
                const mapped = mappedTargets.has(f.key);
                return (
                  <Badge
                    key={f.key}
                    variant="outline"
                    className={
                      mapped
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40"
                    }
                  >
                    {f.label} {mapped ? "✓" : "Missing"}
                  </Badge>
                );
              })}
          </div>

          {missingRequiredFields.length > 0 && !updateExisting && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Map all required fields above (or enable &ldquo;Update existing records&rdquo;)
              before running the simulation.
            </div>
          )}

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Spreadsheet Header</TableHead>
                  <TableHead>Sample Cell Preview</TableHead>
                  <TableHead className="w-[280px]">AssetsVista Target Field</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((header) => {
                  const samples = rawRows
                    .slice(0, 3)
                    .map((r) => String(r[header] ?? "").trim())
                    .filter(Boolean)
                    .slice(0, 2);
                  const currentValue = columnMap[header] || SKIP_FIELD_VALUE;

                  return (
                    <TableRow key={header}>
                      <TableCell className="font-mono text-xs font-medium">{header}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                        {samples.length > 0 ? samples.join("  |  ") : <em>(empty)</em>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentValue}
                          onValueChange={(next) =>
                            setColumnMap((prev) => ({
                              ...prev,
                              [header]: next === SKIP_FIELD_VALUE ? "" : next,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SKIP_FIELD_VALUE}>
                              — Do Not Import (Skip) —
                            </SelectItem>
                            {activeSchema.fields.map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label}
                                {field.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back to Upload
            </Button>
            <Button
              disabled={mappedTargets.size === 0 || simulating}
              onClick={runDryRunSimulation}
              className="gap-2"
            >
              {simulating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Run Pre-Flight Dry Run ({rawRows.length} rows)
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Pre-Flight Dry Run & Conflict Inspector */}
      {step === 3 && (
        <div className="space-y-5">
          {simulating ? (
            <div className="rounded-xl border bg-card p-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm font-medium">
                Validating {rawRows.length} row(s) against live MongoDB workspace data...
              </p>
              <p className="text-xs text-muted-foreground">
                No records are modified during Pre-Flight Dry Run.
              </p>
            </div>
          ) : dryRunResult ? (
            <>
              {/* Dry-Run KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Will Create</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {dryRunResult.createdCount}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Will Update</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {dryRunResult.updatedCount}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Skipped (Existing)</p>
                  <p className="text-2xl font-bold text-muted-foreground mt-1">
                    {dryRunResult.skippedCount}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Validation Errors</p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      dryRunResult.errorCount > 0 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {dryRunResult.errorCount}
                  </p>
                </div>
              </div>

              {dryRunResult.autoCreatedTaxonomy.length > 0 && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 space-y-2">
                  <p className="text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                    {dryRunResult.autoCreatedTaxonomy.length} Missing Taxonomy Record(s) Will Be
                    Auto-Created on Commit:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dryRunResult.autoCreatedTaxonomy.map((label) => (
                      <Badge key={label} variant="outline" className="text-[11px] bg-background">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: "all", label: `All (${dryRunResult.totalRows})` },
                        { id: "valid", label: `Ready (${validCommitCount})` },
                        { id: "errors", label: `Errors (${dryRunResult.errorCount})` },
                        { id: "skipped", label: `Skipped (${dryRunResult.skippedCount})` },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPreviewFilter(t.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          previewFilter === t.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {dryRunResult.errorCount > 0 && (
                      <>
                        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={skipInvalidRows}
                            onCheckedChange={(v) => setSkipInvalidRows(Boolean(v))}
                          />
                          Skip errored rows &amp; commit {validCommitCount} valid row(s)
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => handleExportFailedRows(dryRunResult.rows)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export Failed Rows CSV
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border overflow-x-auto max-h-[420px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Identifier</TableHead>
                        <TableHead>Planned Action</TableHead>
                        <TableHead>Details &amp; Diagnostics</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPreviewRows.slice(0, 150).map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                          <TableCell className="font-medium text-xs">{row.identifier}</TableCell>
                          <TableCell>
                            {row.action === "create" && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                Create
                              </Badge>
                            )}
                            {row.action === "update" && (
                              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                Update
                              </Badge>
                            )}
                            {row.action === "skip" && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Skip
                              </Badge>
                            )}
                            {row.action === "error" && (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.action === "error" ? (
                              <span className="text-destructive">{row.errors.join(" • ")}</span>
                            ) : (
                              <div className="space-y-1">
                                <span>{row.summary}</span>
                                {row.notes.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {row.notes.map((n, i) => (
                                      <Badge
                                        key={`${row.rowNumber}-${i}`}
                                        variant="outline"
                                        className="text-[10px]"
                                      >
                                        {n}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={committing}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Adjust Column Mapping
                  </Button>
                  <Button
                    disabled={
                      committing ||
                      validCommitCount === 0 ||
                      (dryRunResult.errorCount > 0 && !skipInvalidRows)
                    }
                    onClick={handleCommitImport}
                    className="gap-2"
                  >
                    {committing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Commit {validCommitCount} Valid Row(s)
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* STEP 4: Final Commit Summary */}
      {step === 4 && commitResult && (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              {commitResult.createdCount + commitResult.updatedCount > 0 ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              ) : (
                <XCircle className="h-8 w-8 text-amber-500" />
              )}
              <div>
                <h2 className="text-xl font-bold">
                  Import Finished &mdash; {activeSchema.pluralLabel}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Processed {commitResult.totalRows} row(s) from <strong>{filename}</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {commitResult.errorCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleExportFailedRows(commitResult.rows)}
                >
                  <Download className="h-4 w-4" />
                  Export {commitResult.errorCount} Failed Row(s)
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleResetWizard}>
                Import Another File
              </Button>
              <Link href={activeSchema.redirectHref}>
                <Button size="sm" className="gap-1.5">
                  View {activeSchema.pluralLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3.5 bg-muted/20">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {commitResult.createdCount}
              </p>
            </div>
            <div className="rounded-lg border p-3.5 bg-muted/20">
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {commitResult.updatedCount}
              </p>
            </div>
            <div className="rounded-lg border p-3.5 bg-muted/20">
              <p className="text-xs text-muted-foreground">Skipped</p>
              <p className="text-2xl font-bold">{commitResult.skippedCount}</p>
            </div>
            <div className="rounded-lg border p-3.5 bg-muted/20">
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="text-2xl font-bold text-destructive">{commitResult.errorCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Import History Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent Import History &amp; Audit Trail</h2>
          </div>
          <Badge variant="outline" className="text-xs">
            {history.length} Run(s)
          </Badge>
        </div>

        <Skeleton loading={historyLoading}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead>Spreadsheet</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Imported By</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <SampleTableRows
                    columns={["date", "text", "badge", "badge", "text", "actions"]}
                    rowCount={3}
                  />
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-10">
                      No imports have been committed yet. Upload a CSV or Excel file above to get
                      started.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((job) => (
                    <TableRow key={job._id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(job.createdAt), "MMM d, yyyy · HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span>{job.filename}</span>
                          <Badge variant="outline" className="uppercase text-[10px] font-mono">
                            {job.fileFormat}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {IMPORT_ENTITY_SCHEMAS[job.entityType as ImportEntityType]?.pluralLabel ||
                            job.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                            +{job.createdCount} created
                          </Badge>
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px]">
                            ~{job.updatedCount} updated
                          </Badge>
                          {job.errorCount > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {job.errorCount} failed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{job.actorName}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete History Record"
                          onClick={() => handleDeleteHistory(job._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Skeleton>
      </div>
    </div>
  );
}

