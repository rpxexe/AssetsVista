import * as XLSX from "xlsx";

export type ExportCellValue = string | number | boolean | null | undefined;

export interface ExportSheet {
  name: string;
  headers: string[];
  rows: ExportCellValue[][];
}

export interface ExportColumnDef<T> {
  /** Optional column ID matching TanStack table column id (e.g. "asset_tag" or "status.name") */
  id?: string;
  /** Column header displayed in the exported spreadsheet */
  header: string;
  /** Extracts a clean primitive cell value from a row */
  accessor: (row: T) => ExportCellValue;
}

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripExtension(filename: string): string {
  return filename.replace(/\.(csv|xlsx|xls|tsv)$/i, "");
}

function triggerBlobDownload(blob: Blob, fullFilename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fullFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeSheetName(name: string, usedNames: Set<string>): string {
  // Excel restricts sheet names to 31 chars and forbids \ / ? * [ ] :
  const cleaned = (name || "Sheet1")
    .replace(/[\\/?*[\]:]/g, "_")
    .trim()
    .slice(0, 31) || "Sheet1";

  if (!usedNames.has(cleaned)) {
    usedNames.add(cleaned);
    return cleaned;
  }

  let idx = 2;
  while (idx < 100) {
    const suffix = ` (${idx})`;
    const candidate = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    idx += 1;
  }

  return cleaned;
}

/**
 * Checks whether a column definition is visible according to a TanStack VisibilityState map.
 * TanStack replaces "." with "_" in derived accessorKey column IDs, so both forms are checked.
 */
export function isExportColumnVisible<T>(
  col: ExportColumnDef<T>,
  columnVisibility?: Record<string, boolean>
): boolean {
  if (!columnVisibility || !col.id) return true;
  if (columnVisibility[col.id] === false) return false;
  const normalizedId = col.id.replace(/\./g, "_");
  if (columnVisibility[normalizedId] === false) return false;
  return true;
}

/**
 * Converts typed rows + ExportColumnDef list into headers and 2D primitive cell matrix.
 */
export function buildExportMatrix<T>(
  items: T[],
  columns: ExportColumnDef<T>[],
  options?: {
    visibleOnly?: boolean;
    columnVisibility?: Record<string, boolean>;
  }
): { headers: string[]; rows: ExportCellValue[][] } {
  const activeCols =
    options?.visibleOnly && options?.columnVisibility
      ? columns.filter((col) => isExportColumnVisible(col, options.columnVisibility))
      : columns;

  const finalCols = activeCols.length > 0 ? activeCols : columns;
  const headers = finalCols.map((col) => col.header);
  const rows = items.map((item) => finalCols.map((col) => col.accessor(item)));

  return { headers, rows };
}

/**
 * Exports tabular data to a UTF-8 BOM CSV file compatible with Excel and Google Sheets.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: ExportCellValue[][],
  delimiter = ","
): void {
  const sanitize = (val: ExportCellValue): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(sanitize).join(delimiter);
  const dataRows = rows.map((row) => row.map(sanitize).join(delimiter));
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const baseName = stripExtension(filename);
  triggerBlobDownload(blob, `${baseName}_${getDateStamp()}.csv`);
}

/**
 * Exports one or more named worksheets into a native multi-sheet Excel (.xlsx) workbook
 * with auto-sized column widths and header auto-filtering enabled.
 */
export function exportSheetsToExcel(filename: string, sheets: ExportSheet[]): void {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const sheet of sheets) {
    const safeName = sanitizeSheetName(sheet.name, usedNames);
    const normalizedRows = sheet.rows.map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? "" : cell))
    );
    const aoa: (string | number | boolean)[][] = [sheet.headers, ...normalizedRows];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Calculate readable column widths across header + sampled rows
    const colWidths = sheet.headers.map((header, colIdx) => {
      let maxLen = String(header || "").length;
      const sampleLimit = Math.min(normalizedRows.length, 250);
      for (let r = 0; r < sampleLimit; r += 1) {
        const val = normalizedRows[r]?.[colIdx];
        const len = String(val ?? "").length;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen + 3, 10), 46) };
    });
    worksheet["!cols"] = colWidths;

    if (sheet.headers.length > 0 && worksheet["!ref"]) {
      worksheet["!autofilter"] = { ref: worksheet["!ref"] };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const baseName = stripExtension(filename);
  triggerBlobDownload(blob, `${baseName}_${getDateStamp()}.xlsx`);
}

/**
 * Exports a single dataset to a native Excel (.xlsx) workbook.
 */
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: ExportCellValue[][],
  sheetName = "Data"
): void {
  exportSheetsToExcel(filename, [{ name: sheetName, headers, rows }]);
}

