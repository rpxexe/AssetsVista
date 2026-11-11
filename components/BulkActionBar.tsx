"use client";

import React, { useState } from "react";
import { CheckSquare, Download, Loader2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildExportMatrix, exportToExcel, type ExportColumnDef } from "@/lib/exportData";

export interface BulkActionOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "destructive";
  disabled?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  onExecute: () => Promise<void> | void;
}

interface BulkActionBarProps<T> {
  selectedCount: number;
  entityLabel?: string;
  onClearSelection: () => void;
  actions?: BulkActionOption[];
  exportConfig?: {
    filename: string;
    sheetName?: string;
    data: T[];
    columns: ExportColumnDef<T>[];
  };
  extraContent?: React.ReactNode;
}

export function BulkActionBar<T>({
  selectedCount,
  entityLabel = "row",
  onClearSelection,
  actions = [],
  exportConfig,
  extraContent,
}: BulkActionBarProps<T>) {
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<BulkActionOption | null>(null);

  if (selectedCount <= 0) return null;

  const runAction = async (action: BulkActionOption) => {
    setBusyActionId(action.id);
    try {
      await action.onExecute();
    } finally {
      setBusyActionId(null);
      setConfirmingAction(null);
    }
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border bg-muted/50 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1.5 text-xs font-medium">
            <CheckSquare className="h-3.5 w-3.5" />
            {selectedCount} {entityLabel}
            {selectedCount === 1 ? "" : "s"} selected
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={Boolean(busyActionId)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {extraContent}

          {exportConfig && exportConfig.data.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                const { headers, rows } = buildExportMatrix(
                  exportConfig.data,
                  exportConfig.columns
                );
                exportToExcel(
                  exportConfig.filename,
                  headers,
                  rows,
                  exportConfig.sheetName || "Selected"
                );
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export Selected
            </Button>
          )}

          {actions.map((action) => {
            const isBusy = busyActionId === action.id;
            const needsConfirm = Boolean(action.confirmTitle || action.variant === "destructive");
            return (
              <Button
                key={action.id}
                type="button"
                size="sm"
                variant={action.variant || "outline"}
                disabled={action.disabled || Boolean(busyActionId)}
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  if (needsConfirm) {
                    setConfirmingAction(action);
                  } else {
                    void runAction(action);
                  }
                }}
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action.icon}
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>

      <AlertDialog
        open={Boolean(confirmingAction)}
        onOpenChange={(open) => !open && setConfirmingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmingAction?.confirmTitle || `Confirm ${confirmingAction?.label}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingAction?.confirmDescription ||
                `This will apply "${confirmingAction?.label}" to ${selectedCount} selected ${entityLabel}(s).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyActionId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(busyActionId)}
              onClick={() => confirmingAction && void runAction(confirmingAction)}
              className={
                confirmingAction?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {busyActionId ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

