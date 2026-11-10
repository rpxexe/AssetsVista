"use client";

import React from "react";
import {
  CheckSquare,
  ChevronDown,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  ListFilter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  buildExportMatrix,
  exportSheetsToExcel,
  exportToCsv,
  exportToExcel,
  isExportColumnVisible,
  type ExportColumnDef,
  type ExportSheet,
} from "@/lib/exportData";

export interface ExportCustomOption {
  id: string;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  onSelect: () => void;
}

interface ExportButtonProps<T> {
  /** Base filename without extension or date suffix */
  filename: string;
  /** Primary worksheet name for Excel workbooks */
  sheetName?: string;
  /** Active / filtered dataset displayed in the current view */
  data: T[];
  /** Column schema mapping rows to spreadsheet headers and cell values */
  columns: ExportColumnDef<T>[];
  /** Optional unfiltered full dataset (shows "All Records" options when different from data) */
  allData?: T[];
  /** Optional selected rows array (shows "Selected Rows" options) */
  selectedData?: T[];
  /** Optional TanStack VisibilityState map (shows "Visible Columns" options) */
  columnVisibility?: Record<string, boolean>;
  /** Optional KPI/breakdown summary sheet (enables Workbook + Summary options) */
  summarySheet?: ExportSheet | (() => ExportSheet);
  /** Additional format-specific custom menu actions under Excel */
  extraExcelOptions?: ExportCustomOption[];
  /** Additional format-specific custom menu actions under CSV */
  extraCsvOptions?: ExportCustomOption[];
  disabled?: boolean;
  label?: string;
  size?: "default" | "sm" | "lg";
  variant?: "outline" | "default" | "secondary" | "ghost";
  className?: string;
}

export function ExportButton<T>({
  filename,
  sheetName = "Data",
  data,
  columns,
  allData,
  selectedData,
  columnVisibility,
  summarySheet,
  extraExcelOptions = [],
  extraCsvOptions = [],
  disabled = false,
  label = "Export",
  size = "sm",
  variant = "outline",
  className,
}: ExportButtonProps<T>) {
  const { toast } = useToast();

  const hasData = data.length > 0 || (allData ? allData.length > 0 : false) || extraExcelOptions.length > 0;
  const isButtonDisabled = disabled || !hasData;

  const hasFilteredSubset = Boolean(allData && allData.length !== data.length);
  const supportsSelection = selectedData !== undefined;
  const selectedCount = selectedData?.length ?? 0;

  const supportsColumnVisibility = columnVisibility !== undefined;
  const visibleColumnCount = React.useMemo(() => {
    if (!columnVisibility) return columns.length;
    return columns.filter((c) => isExportColumnVisible(c, columnVisibility)).length;
  }, [columns, columnVisibility]);
  const hasHiddenColumns = supportsColumnVisibility && visibleColumnCount < columns.length;

  const resolveSummary = (): ExportSheet | null => {
    if (!summarySheet) return null;
    return typeof summarySheet === "function" ? summarySheet() : summarySheet;
  };

  const notifyExported = (formatLabel: string, count?: number) => {
    toast({
      title: "Export Downloaded",
      description:
        count !== undefined
          ? `Exported ${count} ${count === 1 ? "row" : "rows"} as ${formatLabel}.`
          : `Exported ${formatLabel} successfully.`,
    });
  };

  const runMatrixExport = (
    format: "excel" | "csv",
    items: T[],
    options?: {
      visibleOnly?: boolean;
      suffix?: string;
      delimiter?: "," | ";";
      customSheetName?: string;
    }
  ) => {
    if (!items.length) return;
    const { headers, rows } = buildExportMatrix(items, columns, {
      visibleOnly: options?.visibleOnly,
      columnVisibility,
    });
    const outFilename = options?.suffix ? `${filename}_${options.suffix}` : filename;

    if (format === "excel") {
      exportToExcel(outFilename, headers, rows, options?.customSheetName || sheetName);
      notifyExported("Excel (.xlsx)", items.length);
    } else {
      exportToCsv(outFilename, headers, rows, options?.delimiter ?? ",");
      notifyExported(
        options?.delimiter === ";" ? "CSV Semicolon (.csv)" : "CSV (.csv)",
        items.length
      );
    }
  };

  const handleExportWorkbookWithSummary = () => {
    const summary = resolveSummary();
    if (!summary || !data.length) return;
    const { headers, rows } = buildExportMatrix(data, columns);
    exportSheetsToExcel(`${filename}_with_summary`, [
      summary,
      { name: sheetName, headers, rows },
    ]);
    notifyExported("Excel Workbook with Summary (.xlsx)", data.length);
  };

  const handleExportSummaryCsv = () => {
    const summary = resolveSummary();
    if (!summary) return;
    exportToCsv(`${filename}_summary`, summary.headers, summary.rows);
    notifyExported("Summary CSV (.csv)", summary.rows.length);
  };

  const scopeWord = hasFilteredSubset ? "Filtered View" : "Current View";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isButtonDisabled}
          className={className}
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          {label}
          <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* Excel Options */}
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Excel (.xlsx)
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={data.length === 0}
            onClick={() => runMatrixExport("excel", data)}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{scopeWord} (All Cols)</span>
            <DropdownMenuShortcut>{data.length}</DropdownMenuShortcut>
          </DropdownMenuItem>

          {supportsColumnVisibility && (
            <DropdownMenuItem
              disabled={data.length === 0 || visibleColumnCount === 0}
              onClick={() =>
                runMatrixExport("excel", data, {
                  visibleOnly: true,
                  suffix: hasHiddenColumns ? "visible_cols" : undefined,
                })
              }
              className="cursor-pointer"
            >
              <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Visible Columns Only</span>
              <DropdownMenuShortcut>
                {visibleColumnCount}/{columns.length} cols
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          {hasFilteredSubset && allData && (
            <DropdownMenuItem
              disabled={allData.length === 0}
              onClick={() =>
                runMatrixExport("excel", allData, {
                  suffix: "all",
                  customSheetName: "All Records",
                })
              }
              className="cursor-pointer"
            >
              <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
              <span>All Unfiltered Rows</span>
              <DropdownMenuShortcut>{allData.length}</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          {supportsSelection && (
            <DropdownMenuItem
              disabled={selectedCount === 0}
              onClick={() =>
                runMatrixExport("excel", selectedData || [], {
                  suffix: "selected",
                  customSheetName: "Selected",
                })
              }
              className="cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Selected Rows</span>
              <DropdownMenuShortcut>{selectedCount} sel</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          {summarySheet && (
            <DropdownMenuItem
              disabled={data.length === 0}
              onClick={handleExportWorkbookWithSummary}
              className="cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>With KPI Summary Sheet</span>
              <DropdownMenuShortcut>2 sheets</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          {extraExcelOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.id}
              disabled={opt.disabled}
              onClick={() => {
                opt.onSelect();
                notifyExported(`${opt.label} (.xlsx)`);
              }}
              className="cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{opt.label}</span>
              {opt.badge !== undefined && (
                <DropdownMenuShortcut>{opt.badge}</DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* CSV Options */}
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          CSV (.csv)
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={data.length === 0}
            onClick={() => runMatrixExport("csv", data)}
            className="cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{scopeWord} (Standard)</span>
            <DropdownMenuShortcut>{data.length}</DropdownMenuShortcut>
          </DropdownMenuItem>

          {supportsColumnVisibility && (
            <DropdownMenuItem
              disabled={data.length === 0 || visibleColumnCount === 0}
              onClick={() =>
                runMatrixExport("csv", data, {
                  visibleOnly: true,
                  suffix: hasHiddenColumns ? "visible_cols" : undefined,
                })
              }
              className="cursor-pointer"
            >
              <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Visible Columns Only</span>
              <DropdownMenuShortcut>
                {visibleColumnCount}/{columns.length} cols
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          {hasFilteredSubset && allData && (
            <DropdownMenuItem
              disabled={allData.length === 0}
              onClick={() => runMatrixExport("csv", allData, { suffix: "all" })}
              className="cursor-pointer"
            >
              <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
              <span>All Unfiltered Rows</span>
              <DropdownMenuShortcut>{allData.length}</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          {supportsSelection && (
            <DropdownMenuItem
              disabled={selectedCount === 0}
              onClick={() =>
                runMatrixExport("csv", selectedData || [], { suffix: "selected" })
              }
              className="cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Selected Rows</span>
              <DropdownMenuShortcut>{selectedCount} sel</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          {summarySheet && (
            <DropdownMenuItem
              onClick={handleExportSummaryCsv}
              className="cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>KPI Summary Metrics</span>
              <DropdownMenuShortcut>CSV</DropdownMenuShortcut>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            disabled={data.length === 0}
            onClick={() =>
              runMatrixExport("csv", data, {
                delimiter: ";",
                suffix: "semicolon",
              })
            }
            className="cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Semicolon Delimited (;)</span>
            <DropdownMenuShortcut>{data.length}</DropdownMenuShortcut>
          </DropdownMenuItem>

          {extraCsvOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.id}
              disabled={opt.disabled}
              onClick={() => {
                opt.onSelect();
                notifyExported(`${opt.label} (.csv)`);
              }}
              className="cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{opt.label}</span>
              {opt.badge !== undefined && (
                <DropdownMenuShortcut>{opt.badge}</DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

