"use client";

import React from "react";
import { Trash } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { BulkActionBar } from "@/components/BulkActionBar";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { executeBulkAction } from "@/lib/bulkClient";
import { getClientErrorMessage } from "@/lib/errorMessages";
import type { ExportColumnDef } from "@/lib/exportData";

interface TaxonomyBulkBarProps<T extends { _id: string }> {
  entity:
    | "status"
    | "assetmodel"
    | "category"
    | "company"
    | "department"
    | "location"
    | "manufacturer"
    | "supplier"
    | "actionlog";
  entityLabel: string;
  filename: string;
  sheetName: string;
  selectedRows: T[];
  columns: ExportColumnDef<T>[];
  onClearSelection: () => void;
  onSuccess: () => Promise<unknown> | void;
}

export function TaxonomyBulkBar<T extends { _id: string }>({
  entity,
  entityLabel,
  filename,
  sheetName,
  selectedRows,
  columns,
  onClearSelection,
  onSuccess,
}: TaxonomyBulkBarProps<T>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions } = usePermissions();

  return (
    <BulkActionBar
      selectedCount={selectedRows.length}
      entityLabel={entityLabel}
      onClearSelection={onClearSelection}
      exportConfig={{
        filename,
        sheetName,
        data: selectedRows,
        columns,
      }}
      actions={
        permissions.canManageSettings
          ? [
              {
                id: `bulk-delete-${entity}`,
                label: "Delete Selected",
                icon: <Trash size={14} />,
                variant: "destructive",
                confirmTitle: `Delete ${selectedRows.length} selected ${entityLabel}(s)?`,
                onExecute: async () => {
                  try {
                    const res = await executeBulkAction({
                      entity,
                      action: "delete",
                      ids: selectedRows.map((r) => r._id),
                    });
                    toast({ title: "Bulk Delete Complete", description: res.message });
                    onClearSelection();
                    await Promise.all([
                      onSuccess(),
                      queryClient.invalidateQueries({ queryKey: ["counttotals"] }),
                    ]);
                  } catch (err) {
                    toast({
                      title: "Bulk Delete Failed",
                      description: getClientErrorMessage(
                        err,
                        `Unable to delete selected ${entityLabel}(s).`
                      ),
                      variant: "destructive",
                    });
                  }
                },
              },
            ]
          : []
      }
    />
  );
}

