/**
 * Backward-compatible CSV export re-export wrapper.
 * Prefer importing from "@/lib/exportData" for Excel (.xlsx) + CSV helpers.
 */
export {
  exportToCsv,
  exportToExcel,
  exportSheetsToExcel,
  buildExportMatrix,
  isExportColumnVisible,
  type ExportCellValue,
  type ExportColumnDef,
  type ExportSheet,
} from "@/lib/exportData";
