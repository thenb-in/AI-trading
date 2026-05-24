import { useCallback, useEffect, useMemo, useState } from "react";

const useColumnOrder = (columnsToUse, columnVisibility) => {
  const [columnOrder, setColumnOrder] = useState([]);

  // Keep order in sync with columns: preserve existing order for known fields,
  // and insert genuinely new fields at their natural position (based on the
  // server-supplied columnsToUse order) rather than always appending at the end.
  useEffect(() => {
    setColumnOrder((prev) => {
      const allFields = columnsToUse.map((c) => c.field);

      if (prev.length === 0) {
        return allFields;
      }

      // Retain saved/reordered columns that still exist; drop removed ones.
      const retained = prev.filter((f) => allFields.includes(f));

      // Find columns not yet tracked.
      const newFields = allFields.filter((f) => !prev.includes(f));

      if (newFields.length === 0) {
        return retained.join("|") !== prev.join("|") ? retained : prev;
      }

      // Insert each new field after the closest preceding neighbour that is
      // already in the retained order, mirroring the server-supplied sequence.
      const result = [...retained];
      for (const field of newFields) {
        const naturalIdx = allFields.indexOf(field);
        let insertAfter = -1;
        for (let i = naturalIdx - 1; i >= 0; i--) {
          const pos = result.indexOf(allFields[i]);
          if (pos !== -1) {
            insertAfter = pos;
            break;
          }
        }
        result.splice(insertAfter + 1, 0, field);
      }

      return result.join("|") !== prev.join("|") ? result : prev;
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
