import { useCallback, useEffect, useMemo, useState } from "react";
import { convertCellToText } from "../../base_report/ReportUtils";
import { calculateTotals, getColumnForFormatting, unwrapGridRows } from "../utils/helpers";

const GROUP_PATH_SEPARATOR = " › ";

const asFieldList = (initial) => {
  if (!initial) return [];
  return Array.isArray(initial) ? initial.filter(Boolean) : [initial];
};

/**
 * Which columns the rows are gathered by, read the way sorting is: pressing a
 * column groups by it alone, and holding Shift adds it under what is already
 * grouped — "by item group, and within that by UOM". Pressing a column that is
 * already the only grouping ungroups it; Shift on one already in the chain
 * takes that level out and leaves the rest.
 *
 * `initialGroupByField` takes a field or a list of them.
 */
const useGrouping = (columnsToUse, sortedRows, promoteToPrimarySort, initialGroupByField = null, isSectionHeaderRow = null) => {
  const [groupByFields, setGroupByFields] = useState(() => asFieldList(initialGroupByField));

  const toggleGroupBy = useCallback((field, { chain = false } = {}) => {
    setGroupByFields((prev) => {
      const isGrouped = prev.includes(field);
      if (chain) {
        return isGrouped ? prev.filter((f) => f !== field) : [...prev, field];
      }
      return isGrouped && prev.length === 1 ? [] : [field];
    });
  }, []);

  // Grouping needs its columns at the top of the sort stack, in grouping order,
  // so rows of the same group are contiguous. Promoting from the innermost
  // outwards leaves the first grouped column leading. Secondary sort keys still
  // apply within each group — sorting and grouping share one model instead of
  // competing.
  useEffect(() => {
    for (let i = groupByFields.length - 1; i >= 0; i -= 1) {
      promoteToPrimarySort(groupByFields[i]);
    }
  }, [groupByFields, promoteToPrimarySort]);

  const groupedRows = useMemo(
    () => groupRows(columnsToUse, sortedRows, groupByFields, isSectionHeaderRow),
    [sortedRows, groupByFields, columnsToUse, isSectionHeaderRow]
  );

  return { groupByFields, toggleGroupBy, groupedRows };
};

/**
 * `groupBy` is a field or a list of them. Rows are gathered by every grouped
 * column at once, so a chain of two makes one run per pair of values and the
 * group reads as the path that got there ("Steel (ST) › Pc, Box").
 */
const groupRows = (columnsToUse, sortedRows, groupBy, isSectionHeaderRow = null) => {
    const groupByFields = asFieldList(groupBy);
    if (groupByFields.length === 0) return sortedRows;
    const groupCols = groupByFields
      .map((field) => columnsToUse.find((c) => c.field === field))
      .filter(Boolean);
    if (groupCols.length === 0) return sortedRows;

    const getRawGroupValue = (groupCol, row) => {
      if (typeof groupCol.valueGetter === "function") {
        return groupCol.valueGetter({ row, field: groupCol.field });
      }
      return row?.[groupCol.field];
    };

    // What one row's group reads as: each grouped column's own text, in order.
    const groupLabelOf = (row) => groupCols
      .map((groupCol) => {
        const labelValue = convertCellToText(getColumnForFormatting(groupCol), getRawGroupValue(groupCol, row));
        return labelValue == null ? "" : String(labelValue);
      })
      .join(GROUP_PATH_SEPARATOR);

    const output = [];
    let currentGroupLabel = null;
    let currentGroupKey = null;
    let currentGroupRows = [];
    let groupIndex = 0;

    const flushGroup = () => {
      if (currentGroupRows.length === 0) return;
      currentGroupRows.forEach((w) => output.push(w));

      const rawRows = unwrapGridRows(currentGroupRows);
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
      const id = `__group_total__${groupByFields.join("__")}__${String(currentGroupKey)}__${groupIndex}`;
      output.push({
        _row: {
          id,
          _isGroupTotal: true,
          _isDisabled: true,
          _groupByField: groupByFields[0],
          _groupByFields: groupByFields,
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
      const label = groupLabelOf(row);
      const key = label;
      const continuesGroup = typeof isSectionHeaderRow === "function"
        && !isSectionHeaderRow(row)
        && key.replaceAll(GROUP_PATH_SEPARATOR, "").trim() === ""
        && currentGroupKey !== null;

      if (currentGroupKey === null) {
        currentGroupKey = key;
        currentGroupLabel = label;
      }

      if (!continuesGroup && key !== currentGroupKey) {
        flushGroup();
        currentGroupKey = key;
        currentGroupLabel = label;
      }

      currentGroupRows.push(wrapped);
    });

    flushGroup();
    return output;
};

export { useGrouping, groupRows };
