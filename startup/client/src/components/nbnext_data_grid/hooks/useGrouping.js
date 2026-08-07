import { useCallback, useEffect, useMemo, useState } from "react";
import { convertCellToText } from "../../base_report/ReportUtils";
import { calculateTotals, getColumnForFormatting } from "../utils/helpers";

const useGrouping = (columnsToUse, sortedRows, promoteToPrimarySort, initialGroupByField = null) => {
  const [groupByField, setGroupByField] = useState(initialGroupByField);

  const toggleGroupBy = useCallback((field) => {
    setGroupByField((prev) => (prev === field ? null : field));
  }, []);

  // Grouping needs the grouped column at the top of the sort stack so rows
  // with the same value are contiguous. Secondary keys still apply within each
  // group — sorting and grouping share one model instead of competing.
  useEffect(() => {
    if (!groupByField) return;
    promoteToPrimarySort(groupByField);
  }, [groupByField, promoteToPrimarySort]);

  // Inject a synthetic "group total" row after each contiguous group of rows.
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
      // Nothing numeric to total means the row would carry only the group's
      // label, repeated directly under the rows that already show it. Grouping
      // such a grid is still useful — it keeps each group's rows together —
      // but the footer is noise, so leave it out.
      if (Object.keys(totals).length === 0) {
        currentGroupRows = [];
        groupIndex += 1;
        return;
      }
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
