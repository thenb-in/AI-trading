import { useCallback, useEffect, useMemo, useState } from "react";

const useColumnOrder = (columnsToUse, columnVisibility) => {
  const [columnOrder, setColumnOrder] = useState([]);

  // Keep order in sync with columns: preserve existing order for known fields, append new ones.
  useEffect(() => {
    setColumnOrder((prev) => {
      if (prev.length === 0) {
        return columnsToUse.map((c) => c.field);
      }
      const existing = prev.filter((f) => columnsToUse.some((c) => c.field === f));
      const added = columnsToUse
        .filter((c) => !prev.includes(c.field))
        .map((c) => c.field);
      const merged = [...existing, ...added];
      return merged.join("|") !== prev.join("|") ? merged : prev;
    });
  }, [columnsToUse]);

  const handleColumnReorder = useCallback((dragField, targetField) => {
    setColumnOrder((prev) => {
      const next = [...prev];
      const dragIdx = next.indexOf(dragField);
      const targetIdx = next.indexOf(targetField);
      if (dragIdx === -1 || targetIdx === -1) return prev;
      next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, dragField);
      return next;
    });
  }, []);

  const visibleColumns = useMemo(() => {
    const visible = columnsToUse.filter((c) => columnVisibility[c.field]);
    if (columnOrder.length === 0) return visible;
    return [...visible].sort((a, b) => {
      const ai = columnOrder.indexOf(a.field);
      const bi = columnOrder.indexOf(b.field);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
  }, [columnsToUse, columnVisibility, columnOrder]);

  return { columnOrder, setColumnOrder, handleColumnReorder, visibleColumns };
};

export { useColumnOrder };
