import { useCallback, useImperativeHandle, useState } from "react";
import {
  calculateTotals,
  filterRows,
  indexRows,
  normalizeColumns,
  sortRows,
} from "../utils/helpers";
import { detectConstantColumns } from "../utils/constantColumnsUtils";
import {
  handleExport as handleExcelExportToFile,
  handleMultiSheetExport,
} from "../../base_report/report_export";

// Visible columns from the full column set (includes constant columns hidden in
// the grid when hideConstantColumns is on). Respects visibility toggles + order.
const resolveExportVisibleColumns = (
  showInsightsAsHeader,
  visibleColumns,
  normalizedColumns,
  columnVisibility,
  columnOrder
) => {
  if (!showInsightsAsHeader) {
    return visibleColumns.filter(
      (c) => c.field !== "__actions__"
    );
  }

  const visible = (normalizedColumns || [])
    .filter((c) => columnVisibility[c.field] !== false)
    .filter((c) => c.field !== "__actions__");

  if (!columnOrder?.length) {
    return visible;
  }

  const orderedSet = new Set(columnOrder);

  const orderedColumns = columnOrder
    .map((field) => visible.find((c) => c.field === field))
    .filter(Boolean);

  let orderedIndex = 0;

  return visible.map((col) => {
    if (orderedSet.has(col.field)) {
      return orderedColumns[orderedIndex++];
    }

    return col;
  });
};

// Resolve a tab's effective (rows, columns, summary). Mirrors useTabsState's
// resolver but as a pure helper so export can iterate every tab, not just the
// active one. Columns is filtered/ordered by `columnFields` when provided, or
// fully overridden by `columns`, or falls back to the top-level set.
const resolveTabTriple = (tab, rowsProp, columnsProp, summaryProp) => {
  const rows = Array.isArray(tab?.rows) ? tab.rows : rowsProp || [];
  const summary = tab?.summary != null ? tab.summary : summaryProp;
  let columns;
  if (Array.isArray(tab?.columns)) {
    columns = tab.columns;
  } else if (Array.isArray(tab?.columnFields)) {
    const byField = new Map((columnsProp || []).map((c) => [c.field, c]));
    columns = tab.columnFields.map((f) => byField.get(f)).filter(Boolean);
  } else {
    columns = columnsProp || [];
  }
  return { rows, columns, summary };
};

// Runs the export pipeline (normalize → detect constants → filter → sort →
// column visibility → total row) over a raw (rows, columns) pair, returning
// the shape expected by reportExport's populateReportSheet helper.
const buildSheetFromRaw = (
  rawRows,
  rawColumns,
  {
    filterModel,
    sortModel,
    hideConstantColumns,
    columnVisibility,
    showTotalRow,
    showInsightsAsHeader,
    showEmptyColumns,
  }
) => {
  const normalized = normalizeColumns(rawColumns || []);
  const { constantColumns } = detectConstantColumns(rawRows || [], normalized);

  const shouldHideConstants =
    !showInsightsAsHeader && hideConstantColumns && (rawRows?.length || 0) > 1;
  // `detectConstantColumns` returns only the Map of constants; derive the
  // visible-column subset here by dropping any field present in it.
  const colsToUse = shouldHideConstants
    ? normalized.filter((c) => !constantColumns.has(c.field))
    : normalized;

  const indexed = indexRows(rawRows || []);
  const filtered = filterRows(indexed, filterModel || {}, colsToUse);
  const sorted = sortRows(filtered, sortModel || { field: null, sort: null }, colsToUse);
  const unwrapped = sorted.map((w) => w._row || w);

  // Respect the user's column visibility toggles. Unknown fields (not in the
  // state map) default to visible.
  const visibleCols = columnVisibility
    ? colsToUse.filter((c) => columnVisibility[c.field] !== false)
    : colsToUse;

  const totalRow =
    showTotalRow && unwrapped.length > 1 ? calculateTotals(unwrapped, visibleCols) : null;

  return {
    rows: unwrapped,
    columns: visibleCols,
    constantColumns,
    totalRow: totalRow && Object.keys(totalRow).length > 0 ? totalRow : null,
    showInsightsAsHeader,
    showEmptyColumns,
  };
};

// Centralizes the export surface: getExportPayload (for toolbar buttons),
// the imperatively-exposed getExportData (via ref), and the Excel handler.
// When `tabs` contains >1 tab, Excel export produces one sheet per tab via
// handleMultiSheetExport; otherwise the single-sheet path is used.
const useGridExport = ({
  ref,
  groupedRows,
  sortedRows,
  visibleColumns,
  normalizedColumns,
  columnOrder,
  summary,
  constantColumns,
  showTotalRow,
  showInsightsAsHeader = false,
  showEmptyColumns = false,
  onExcelExport,
  exportReport,
  // Tabs-aware multi-sheet inputs
  tabs,
  rowsProp,
  columnsProp,
  summaryProp,
  filterModel,
  sortModel,
  columnVisibility,
  hideConstantColumns,
}) => {
  const exportColumns = resolveExportVisibleColumns(
    showInsightsAsHeader,
    visibleColumns,
    normalizedColumns,
    columnVisibility,
    columnOrder
  );

  const getExportPayload = useCallback(() => {
    const unwrappedRows = (groupedRows || sortedRows).map(
      (wrapped) => wrapped._row || wrapped
    );
    const dataRowsOnly = unwrappedRows.filter((r) => !r?._isGroupTotal);
    const totalRow =
      showTotalRow && dataRowsOnly.length > 1
        ? calculateTotals(dataRowsOnly, exportColumns)
        : null;
    return {
      rows: unwrappedRows,
      columns: exportColumns,
      summary: summary || {},
      constantColumns,
      totalRow: totalRow && Object.keys(totalRow).length > 0 ? totalRow : null,
      showInsightsAsHeader,
      showEmptyColumns,
    };
  }, [
    groupedRows,
    sortedRows,
    exportColumns,
    summary,
    constantColumns,
    showTotalRow,
    showInsightsAsHeader,
    showEmptyColumns,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      getExportData: () => {
        const unwrappedRows = (groupedRows || sortedRows).map(
          (wrapped) => wrapped._row || wrapped
        );
        const dataRowsOnly = unwrappedRows.filter((r) => !r?._isGroupTotal);
        const totalRow =
          showTotalRow && dataRowsOnly.length > 1
            ? calculateTotals(dataRowsOnly, exportColumns)
            : null;
        return {
          rows: unwrappedRows,
          columns: exportColumns,
          summary,
          constantColumns,
          totalRow: totalRow && Object.keys(totalRow).length > 0 ? totalRow : null,
          showInsightsAsHeader,
          showEmptyColumns,
        };
      },
    }),
    [
      groupedRows,
      sortedRows,
      exportColumns,
      summary,
      constantColumns,
      showTotalRow,
      showInsightsAsHeader,
      showEmptyColumns,
    ]
  );

  // Build one Excel-sheet payload per tab. For each tab we run the export
  // pipeline fresh over the tab's effective (rows, columns) — this keeps all
  // sheets consistent w.r.t. the user's current filter/sort/visibility state
  // without inheriting active-tab-only concepts like row grouping.
  const getMultiSheetPayload = useCallback(() => {
    const hasMultiTabs = Array.isArray(tabs) && tabs.length > 1;
    if (!hasMultiTabs) return null;

    const pipeline = {
      filterModel,
      sortModel,
      hideConstantColumns,
      columnVisibility,
      showTotalRow,
      showInsightsAsHeader,
      showEmptyColumns,
    };

    return tabs.map((tab) => {
      const { rows: tabRows, columns: tabColumns, summary: tabSummary } = resolveTabTriple(
        tab,
        rowsProp,
        columnsProp,
        summaryProp
      );
      const sheetData = buildSheetFromRaw(tabRows, tabColumns, pipeline);
      return {
        name: typeof tab?.label === "string" ? tab.label : String(tab?.id ?? ""),
        rows: sheetData.rows,
        columns: sheetData.columns,
        summary: tabSummary || {},
        constantColumns: sheetData.constantColumns,
        totalRow: sheetData.totalRow,
        showInsightsAsHeader: sheetData.showInsightsAsHeader,
        showEmptyColumns: sheetData.showEmptyColumns,
      };
    });
  }, [
    tabs,
    rowsProp,
    columnsProp,
    summaryProp,
    filterModel,
    sortModel,
    columnVisibility,
    hideConstantColumns,
    showTotalRow,
    showInsightsAsHeader,
    showEmptyColumns,
  ]);

  const [isExcelExporting, setIsExcelExporting] = useState(false);

  const handleExcelExport = useCallback(async () => {
    const multiSheets = getMultiSheetPayload();
    const payload = getExportPayload();

    // Multi-sheet path: one sheet per tab. Used when the grid has 2+ tabs.
    if (multiSheets && multiSheets.length > 0) {
      if (typeof onExcelExport === "function") {
        setIsExcelExporting(true);
        try {
          await onExcelExport({ sheets: multiSheets, showInsightsAsHeader, showEmptyColumns });
        } finally {
          setIsExcelExporting(false);
        }
        return;
      }
      if (exportReport?.title && exportReport?.slug) {
        setIsExcelExporting(true);
        try {
          await handleMultiSheetExport({
            report: exportReport,
            sheets: multiSheets,
            currentUrl: typeof window !== "undefined" ? window.location.href : "",
            showInsightsAsHeader,
            showEmptyColumns,
          });
        } finally {
          setIsExcelExporting(false);
        }
      }
      return;
    }

    // Single-sheet path: unchanged behavior when there are 0 or 1 tabs.
    if (!payload.rows?.length) return;

    if (typeof onExcelExport === "function") {
      setIsExcelExporting(true);
      try {
        await onExcelExport(payload);
      } finally {
        setIsExcelExporting(false);
      }
      return;
    }

    if (exportReport?.title && exportReport?.slug) {
      setIsExcelExporting(true);
      try {
        await handleExcelExportToFile(
          exportReport,
          payload.rows,
          payload.columns,
          typeof window !== "undefined" ? window.location.href : "",
          payload.summary,
          payload.constantColumns,
          payload.totalRow,
          payload.showInsightsAsHeader,
          payload.showEmptyColumns
        );
      } finally {
        setIsExcelExporting(false);
      }
    }
  }, [onExcelExport, exportReport, getExportPayload, getMultiSheetPayload]);

  return { isExcelExporting, handleExcelExport, getExportPayload };
};

export { useGridExport };
