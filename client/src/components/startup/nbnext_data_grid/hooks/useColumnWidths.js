import { useEffect, useState } from "react";

// Base width rule: 2n+1 character width plus fixed icon slot (sort + freeze + group).
const calculateColumnWidth = (col) => {
  if (col.width) return col.width;

  const columnName = col.headerName || col.field || "";
  const n = columnName.length;
  const baseWidth = 15 * n + 18;

  const sortIconWidth  = col.sortable !== false ? 22 : 0;
  const freezeIconWidth = 32;
  const groupIconWidth  = 32;
  const iconSpace = sortIconWidth + freezeIconWidth + groupIconWidth;

  return Math.max(baseWidth + iconSpace, 80);
};

// Manages column widths with user-resize persistence. Explicit width props
// always win; user-resized widths are preserved across re-renders.
const useColumnWidths = (columns) => {
  const [columnWidths, setColumnWidths] = useState(() => {
    const widths = {};
    columns.forEach((col) => {
      widths[col.field] = calculateColumnWidth(col);
    });
    return widths;
  });

  const handleColumnResize = (field, newWidth) => {
    setColumnWidths((prev) => ({ ...prev, [field]: newWidth }));
  };

  // Preserve user-resized widths; only (re)compute for columns without a prior width
  // or when the column definition supplies an explicit width override.
  useEffect(() => {
    setColumnWidths((prev) => {
      const newWidths = { ...prev };
      columns.forEach((col) => {
        if (col.width) {
          newWidths[col.field] = col.width;
        } else if (!(col.field in prev)) {
          newWidths[col.field] = calculateColumnWidth(col);
        }
      });
      return newWidths;
    });
  }, [columns]);

  return { columnWidths, handleColumnResize };
};

export { useColumnWidths };
