import { useMemo, useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { ArrowUp } from "lucide-react";

// Hooks
import { useSorting } from "./hooks/useSorting.js";
import { useColumnVisibility } from "./hooks/useColumnVisibility.js";
import { useFrozenColumns } from "./hooks/useFrozenColumns.js";
import { usePagination } from "./hooks/usePagination.js";
import { useRowSelection } from "./hooks/useRowSelection.js";
import { useMeasurements } from "./hooks/useMeasurements.js";
import { useFiltering } from "./hooks/useFiltering.js";
import { useVirtualScrolling } from "./hooks/useVirtualScrolling.js";
import { useColumnWidths } from "./hooks/useColumnWidths.js";
import { useFullScreenToggle } from "./hooks/useFullScreenToggle.js";
import { useSidebarWidth } from "./hooks/useSidebarWidth.js";
import { useScrollContainerHeight } from "./hooks/useScrollContainerHeight.js";
import { useScrollToTopOnPagination } from "./hooks/useScrollToTopOnPagination.js";
import { useDefaultLayoutLoader } from "./hooks/useDefaultLayoutLoader.js";
import { useGridExport } from "./hooks/useGridExport.js";

// Components
import { EmptyState } from "./components/EmptyState.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { ColumnMenu } from "./components/ColumnMenu.jsx";
import { LayoutMenu } from "./components/layout/LayoutMenu.jsx";
import { DataGridHeader } from "./components/DataGridHeader.jsx";
import { DataGridBody } from "./components/DataGridBody.jsx";

// Utilities
import {
  normalizeColumns,
  indexRows,
  filterRows,
  sortRows,
  applyColumnConfig,
} from "./utils/helpers.js";
import { getGridContainerStyle, scrollAreaStyle, tableStyle } from "./utils/styles.js";

function NbNextDataGrid({
  rows = [],
  columns = [],
  height = 560,
  initialSortModel = { field: null, sort: null },
  onSortModelChange = null,
  initialColumnVisibility = null,
  onColumnVisibilityChange = null,
  getRowId = null,
  density = "comfortable",
  // eslint-disable-next-line no-unused-vars
  autoHeight: _autoHeight, // Accept prop but ignore it - always use true
  onRowSelect = null,
  documentName = null,
  fullScreen: externalFullScreen,
  showTotalRow = false,
  frozenColumns = [],
  // Export props
  exportReport = null,
  onExcelExport = null,
  renderToolbarExtras = null,
  summary = {},
}) {
  // Force autoHeight to always be true
  const autoHeight = true;

  // Refs for measuring
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const firstRowRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // Fullscreen toggle (with Alt+F shortcut when not externally controlled)
  const { fullScreen, handleToggleFullScreen } = useFullScreenToggle(externalFullScreen);

  // Sidebar width in fullscreen mode
  const sidebarWidth = useSidebarWidth(fullScreen);

  // Normalize columns
  const normalizedColumns = useMemo(() => normalizeColumns(columns), [columns]);

  // Column widths with user-resize persistence
  const { columnWidths, handleColumnResize } = useColumnWidths(normalizedColumns);

  // Column visibility hook
  const { columnVisibility, toggleColumnVisibility, setColumnVisibilityState } =
    useColumnVisibility(normalizedColumns, initialColumnVisibility, onColumnVisibilityChange);

  // Visible columns
  const visibleColumns = useMemo(() => {
    return normalizedColumns.filter((c) => columnVisibility[c.field]);
  }, [normalizedColumns, columnVisibility]);

  // Frozen columns hook
  const {
    frozenState,
    toggleFrozen,
    setFrozenStateState,
    frozenColumns: computedFrozenColumns,
    nonFrozenColumns,
    cumulativeFrozenLeftOffsets,
  } = useFrozenColumns(normalizedColumns, visibleColumns, columnWidths, frozenColumns);

  // Sorting hook
  const { sortModel, handleHeaderClick } = useSorting(initialSortModel, onSortModelChange);

  // Filtering hook
  const { filterModel, handleFilterChange, clearAllFilters } = useFiltering();
  const hasActiveFilters = Object.keys(filterModel).some((k) => filterModel[k]);

  // Index, filter, and sort rows
  const indexedRows = useMemo(() => indexRows(rows), [rows]);
  const filteredRows = useMemo(
    () => filterRows(indexedRows, filterModel, normalizedColumns),
    [indexedRows, filterModel, normalizedColumns]
  );
  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortModel, normalizedColumns),
    [filteredRows, sortModel, normalizedColumns]
  );

  // Pagination hook — skip pagination in fullscreen mode
  const visibleColumnCount = visibleColumns.length || 1;
  const { page, totalPages, autoPageSize, pagedRows, goToNextPage, goToPrevPage } =
    usePagination(sortedRows, visibleColumnCount, fullScreen);

  // Scroll-to-top button tracking (shows only when bottom toolbar triggers page change)
  const {
    showScrollToTop,
    handleScrollToTop,
    handleTopGoToNextPage,
    handleTopGoToPrevPage,
    handleBottomGoToNextPage,
    handleBottomGoToPrevPage,
  } = useScrollToTopOnPagination({ page, fullScreen, goToNextPage, goToPrevPage });

  // Row selection hook
  const { selectedRowId, hoveredRowId, handleRowClick, handleRowHover, handleRowLeave } =
    useRowSelection(onRowSelect);

  // Measurements hook
  const { rowHeight, computedContainerHeight } = useMeasurements(
    headerRef,
    firstRowRef,
    pagedRows,
    visibleColumns,
    density,
    autoHeight,
    height,
    fullScreen
  );

  // Scroll container height for virtual scrolling
  const scrollContainerHeight = useScrollContainerHeight(
    fullScreen,
    scrollAreaRef,
    computedContainerHeight
  );

  // Virtual scrolling for fullscreen mode
  const virtualScrollingResult = useVirtualScrolling(
    fullScreen ? sortedRows : [],
    rowHeight,
    scrollContainerHeight,
    scrollAreaRef.current,
    10
  );

  // Use virtual scrolling rows in fullscreen, otherwise use regular display rows
  const displayRows = fullScreen ? virtualScrollingResult.visibleRows : pagedRows;

  // Column menu state
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Handle layout load
  const handleLayoutLoad = useCallback(
    (columnConfig) => {
      if (!columnConfig || !Array.isArray(columnConfig)) return;
      const { columnVisibility: newVisibility, frozenState: newFrozenState } = applyColumnConfig(
        normalizedColumns,
        columnConfig
      );
      setColumnVisibilityState(newVisibility);
      setFrozenStateState(newFrozenState);
    },
    [normalizedColumns, setColumnVisibilityState, setFrozenStateState]
  );

  // Auto-load default layout on mount
  useDefaultLayoutLoader({
    documentName,
    columns,
    normalizedColumns,
    applyLayout: handleLayoutLoad,
  });

  // Export hook
  const { isExcelExporting, handleExcelExport, getExportPayload } = useGridExport({
    ref: null,
    groupedRows: null,
    sortedRows,
    visibleColumns,
    summary,
    constantColumns: null,
    showTotalRow,
    onExcelExport,
    exportReport,
    tabs: null,
    rowsProp: rows,
    columnsProp: columns,
    summaryProp: summary,
    filterModel,
    sortModel,
    columnVisibility,
    hideConstantColumns: false,
  });

  const showExcelExport = Boolean(exportReport || onExcelExport);

  // Compute grid container style
  const gridContainerStyle = getGridContainerStyle(
    computedContainerHeight,
    fullScreen,
    sidebarWidth
  );

  // Empty state
  if (!rows || rows.length === 0 || visibleColumns.length === 0) {
    return <EmptyState />;
  }

  const commonToolbarProps = {
    totalRows: sortedRows.length,
    visibleColumnsCount: visibleColumns.length,
    setShowColumnMenu,
    showColumnMenu,
    showLayoutMenu,
    setShowLayoutMenu,
    documentName,
    page,
    totalPages,
    autoPageSize,
    fullScreen,
    onToggleFullScreen: externalFullScreen !== undefined ? null : handleToggleFullScreen,
    showExcelExport,
    onExcelExport: handleExcelExport,
    isExcelExporting,
    hasData: sortedRows.length > 0,
    getExportPayload,
    renderToolbarExtras,
    hasActiveFilters,
    onClearFilters: clearAllFilters,
  };

  return (
    <div ref={containerRef} style={gridContainerStyle}>
      <Toolbar
        {...commonToolbarProps}
        goToPrevPage={handleTopGoToPrevPage}
        goToNextPage={handleTopGoToNextPage}
        position="top"
      />
      {showColumnMenu && (
        <ColumnMenu
          normalizedColumns={normalizedColumns}
          columnVisibility={columnVisibility}
          frozenState={frozenState}
          toggleColumnVisibility={toggleColumnVisibility}
          toggleFrozen={toggleFrozen}
          onClose={() => setShowColumnMenu(false)}
        />
      )}
      {showLayoutMenu && documentName && (
        <LayoutMenu
          documentName={documentName}
          normalizedColumns={normalizedColumns}
          columnVisibility={columnVisibility}
          frozenState={frozenState}
          sortModel={sortModel}
          onLayoutLoad={handleLayoutLoad}
          onClose={() => setShowLayoutMenu(false)}
        />
      )}
      <div ref={scrollAreaRef} style={scrollAreaStyle(fullScreen)}>
        <table style={tableStyle}>
          <DataGridHeader
            headerRef={headerRef}
            frozenColumns={computedFrozenColumns}
            nonFrozenColumns={nonFrozenColumns}
            cumulativeFrozenLeftOffsets={cumulativeFrozenLeftOffsets}
            sortModel={sortModel}
            frozenState={frozenState}
            handleHeaderClick={handleHeaderClick}
            toggleFrozen={toggleFrozen}
            columnWidths={columnWidths}
            handleColumnResize={handleColumnResize}
            fullScreen={fullScreen}
            filterModel={filterModel}
            handleFilterChange={handleFilterChange}
          />
          <DataGridBody
            firstRowRef={firstRowRef}
            pagedRows={displayRows}
            frozenColumns={computedFrozenColumns}
            nonFrozenColumns={nonFrozenColumns}
            cumulativeFrozenLeftOffsets={cumulativeFrozenLeftOffsets}
            selectedRowId={selectedRowId}
            hoveredRowId={hoveredRowId}
            handleRowClick={handleRowClick}
            handleRowHover={handleRowHover}
            handleRowLeave={handleRowLeave}
            rowHeight={rowHeight}
            getRowIdFunc={getRowId}
            columnWidths={columnWidths}
            virtualScrolling={fullScreen}
            offsetY={fullScreen ? virtualScrollingResult.offsetY : 0}
            totalHeight={fullScreen ? virtualScrollingResult.totalHeight : 0}
            startIndex={fullScreen ? virtualScrollingResult.startIndex : 0}
            showTotalRow={showTotalRow}
            allRows={sortedRows}
            allColumns={normalizedColumns}
          />
        </table>
      </div>
      {!fullScreen && (
        <Toolbar
          {...commonToolbarProps}
          goToPrevPage={handleBottomGoToPrevPage}
          goToNextPage={handleBottomGoToNextPage}
          position="bottom"
        />
      )}
      {showScrollToTop && (
        <button
          type="button"
          onClick={handleScrollToTop}
          className="fixed bottom-20 right-6 z-50 px-4 py-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUp size={18} />
          <span className="text-sm font-medium">Scroll to Top</span>
        </button>
      )}
    </div>
  );
}

NbNextDataGrid.propTypes = {
  rows: PropTypes.array.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      headerName: PropTypes.string,
      width: PropTypes.number,
      sortable: PropTypes.bool,
      frozen: PropTypes.bool,
      hide: PropTypes.bool,
      renderCell: PropTypes.func,
      valueGetter: PropTypes.func,
      type: PropTypes.string,
    })
  ).isRequired,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  initialSortModel: PropTypes.shape({
    field: PropTypes.string,
    sort: PropTypes.oneOf(["asc", "desc"]),
  }),
  onSortModelChange: PropTypes.func,
  initialColumnVisibility: PropTypes.object,
  onColumnVisibilityChange: PropTypes.func,
  getRowId: PropTypes.func,
  density: PropTypes.oneOf(["compact", "standard", "comfortable"]),
  autoHeight: PropTypes.bool,
  onRowSelect: PropTypes.func,
  documentName: PropTypes.string,
  fullScreen: PropTypes.bool,
  showTotalRow: PropTypes.bool,
  frozenColumns: PropTypes.arrayOf(PropTypes.string),
  exportReport: PropTypes.shape({
    title: PropTypes.string,
    slug: PropTypes.string,
  }),
  onExcelExport: PropTypes.func,
  renderToolbarExtras: PropTypes.func,
  summary: PropTypes.object,
};

export { NbNextDataGrid };
