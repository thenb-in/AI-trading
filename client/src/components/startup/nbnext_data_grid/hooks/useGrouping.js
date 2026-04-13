import { useCallback, useEffect, useMemo, useState } from "react";
import { convertCellToText } from "../../BaseReport/ReportUtils.js";
import { calculateTotals, getColumnForFormatting } from "../utils/helpers.js";

// Manages row grouping by a single column. When a group-by field is active:
//   - Sorts ascending by that field (via setSortModelProgrammatic)
//   - Injects a synthetic "_isGroupTotal" summary row after each group
const useGrouping = (columnsToUse, sortedRows, setSortModelProgrammatic) => {
  const [groupByField, setGroupByField] = useState(null);

  const toggleGroupBy = useCallback((field) => {
    setGroupByField((prev) => (prev === field ? null : field));
  }, []);

  // When grouping is enabled, enforce asc sort on the grouped column.
  useEffect(() => {
    if (!groupByField) return;
    setSortModelProgrammatic({ field: groupByField, sort: "asc" });
  }, [groupByField, setSortModelProgrammatic]);

  const groupedRows = useMemo(() => {
    if (!groupByField) return sortedRows;
    const groupCol = columnsToUse.find((c) => c.field === groupByField);
    if (!groupCol) return sortedRows;

    const getRawGroupValue = (row) => {
      if (typeof groupCol.valueGetter === "function") {
        return groupCol.valueGetter({ row, field: groupCol.field });
      }
      return row?.[groupCol.field];
    };

    const output = [];
    let currentGroupLabel = null;
    let currentGroupKey = null;
    let currentGroupRows = [];
    let groupIndex = 0;

    const flushGroup = () => {
      if (currentGroupRows.length === 0) return;
      currentGroupRows.forEach((w) => output.push(w));

      const rawRows = currentGroupRows.map((w) => w._row || w);
      const totals = calculateTotals(rawRows, columnsToUse);
      const id = `__group_total__${groupByField}__${String(currentGroupKey)}__${groupIndex}`;
      output.push({
        _row: {
          id,
          _isGroupTotal: true,
          _isDisabled: true,
          _groupByField: groupByField,
          _groupLabel: currentGroupLabel,
          _groupTotals: totals,
        },
        _origIndex: currentGroupRows[currentGroupRows.length - 1]?._origIndex ?? 0,
      });

      groupIndex += 1;
      currentGroupRows = [];
    };

    sortedRows.forEach((wrapped) => {
      const row = wrapped?._row;
      const rawValue = getRawGroupValue(row);
      const labelValue = convertCellToText(getColumnForFormatting(groupCol), rawValue);
      const label = labelValue == null ? "" : String(labelValue);
      const key = label;

      if (currentGroupKey === null) {
        currentGroupKey = key;
        currentGroupLabel = label;
      }

      if (key !== currentGroupKey) {
        flushGroup();
        currentGroupKey = key;
        currentGroupLabel = label;
      }

      currentGroupRows.push(wrapped);
    });

    flushGroup();
    return output;
  }, [sortedRows, groupByField, columnsToUse]);

  return { groupByField, toggleGroupBy, groupedRows };
};

export { useGrouping };
