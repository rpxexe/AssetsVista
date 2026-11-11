"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Reusable row-ID multi-selection state for custom (non-TanStack) tables.
 */
export function useBulkSelection() {
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => new Set());

  const selectedIds = useMemo(() => Array.from(selectedSet), [selectedSet]);

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  const toggleOne = useCallback((id: string, nextChecked?: boolean) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      const shouldSelect = nextChecked !== undefined ? nextChecked : !next.has(id);
      if (shouldSelect) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((visibleIds: string[], nextChecked?: boolean) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      const allCurrentlySelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const shouldSelect = nextChecked !== undefined ? nextChecked : !allCurrentlySelected;

      if (shouldSelect) {
        for (const id of visibleIds) next.add(id);
      } else {
        for (const id of visibleIds) next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedSet(new Set());
  }, []);

  const headerCheckState = useCallback(
    (visibleIds: string[]): boolean | "indeterminate" => {
      if (visibleIds.length === 0) return false;
      const count = visibleIds.filter((id) => selectedSet.has(id)).length;
      if (count === 0) return false;
      if (count === visibleIds.length) return true;
      return "indeterminate";
    },
    [selectedSet]
  );

  return {
    selectedIds,
    selectedCount: selectedSet.size,
    isSelected,
    toggleOne,
    toggleAll,
    clear,
    headerCheckState,
  };
}

