import { useMemo, useState, useRef, useCallback, forwardRef } from "react";
import PropTypes from "prop-types";

// Hooks
import { useSorting } from "./hooks/useSorting.js";
import { useColumnVisibility } from "./hooks/useColumnVisibility.js";
import { useFrozenColumns } from "./hooks/useFrozenColumns.js";
import { usePagination } from "./hooks/usePagination.js";
import { useRowSelection } from "./hooks/useRowSelection.js";
import { useMeasurements } from "./hooks/useMeasurements.js";
import { useFiltering } from "./hooks/useFiltering.js";
import { useVirtualScrolling } from "./hooks/useVirtualScrolling.js";
import { useConstantColumns } from "./hooks/useConstantColumns.js";
import { useSidebarWidth } from "./hooks/useSidebarWidth.js";
import { useColumnWidths } from "./hooks/useColumnWidths.js";
import { useColumnOrder } from "./hooks/useColumnOrder.js";
import { useGrouping } from "./hooks/useGrouping.js";
import { useScrollToTopOnPagination } from "./hooks/useScrollToTopOnPagination.js";
import { useScrollContainerHeight } from "./hooks/useScrollContainerHeight.js";
import { useDefaultLayoutLoader } from "./hooks/useDefaultLayoutLoader.js";
import { useFullScreenToggle } from "./hooks/useFullScreenToggle.js";
import { useTabsState } from "./hooks/useTabsState.js";
import { useGridExport } from "./hooks/useGridExport.js";
import { useInsightsCollapse } from "./hooks/useInsightsCollapse.js";

// Components
import { EmptyState } from "./components/EmptyState.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { ColumnMenu } from "./components/ColumnMenu.jsx";
import { LayoutMenu } from "./components/layout/LayoutMenu.jsx";
import { DataGridHeader } from "./components/DataGridHeader.jsx";
import { DataGridBody } from "./components/DataGridBody.jsx";
import { InsightsPanel } from "./components/InsightsPanel.jsx";
import { GridTabs } from "./components/GridTabs.jsx";
import { GridScrollToTopButton } from "./components/GridScrollToTopButton.jsx";

// Utilities
import { normalizeColumns, indexRows, filterRows, sortRows, applyColumnConfig } from "./utils/helpers.js";
import { getGridContainerStyle, scrollAreaStyle, tableStyle } from "./utils/styles.js";


const NbNextDataGrid = forwardRef(({
  rows: rowsProp = [],
  columns: columnsProp = [],
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
  hideConstantColumns = true,
  summary: summaryProp = null,
  evenRowColor = "#ffffff",
  oddRowColor = "#eff6ff",
  showExcelExport = false,
  /** { title, slug } for default Excel export. When provided (and onExcelExport not set), grid uses built-in handleExport. */
  exportReport = null,
  /**
   * Optional. When provided, Excel button calls this with payload: { rows, columns, summary, constantColumns } (grid data).
   * Use this when your report has a different data/response structure: pass your own rows/columns to handleExport.
   * Example: onExcelExport={async (payload) => { await handleExport({ title, slug }, myRows, myColumns, window.location.href, mySummary, payload.constantColumns); }}
   */
  onExcelExport = null,
  /**
   * Optional. Render extra toolbar controls (e.g. PDF). Prefer useNbNextDataGridToolbarExtras in the report.
   * Called with { getExportPayload, disabled, position } — same payload shape as ref.getExportData(); position is "top" | "bottom".
   */
  renderToolbarExtras = null,
  /**
   * Optional read-only tabs. When provided, the grid renders only the active
   * tab's data — inactive tabs never enter the sort/filter/render pipeline.
   *
   * Each tab may optionally override any of:
   *   - `rows`          full row override (otherwise shares top-level `rows`)
   *   - `summary`       summary override (otherwise shares top-level `summary`)
   *   - `columnFields`  field-name subset of top-level `columns` (with order)
   *   - `columns`       full column override; wins over `columnFields`
   *
   * The common case — one shared dataset shown under different column groupings
   * — only needs `columnFields` per tab, so callers don't ship redundant rows.
   *
   * Shape:
   *   [{ id, label, rows?, summary?, columnFields?, columns? }, ...]
   */
  tabs = null,
  defaultActiveTabId = null,
}, ref) => {
  // Tabs: active tab drives which rows/summary/columns flow through the pipeline.
  // A tab may override any of rows/summary/columns; if omitted, the top-level
  // props are shared across tabs (letting callers ship one dataset for many tabs).
  const { hasTabs, activeTabId, setActiveTabId, rows, summary, columns } = useTabsState({
    tabs,
    defaultActiveTabId,
    rowsProp,
    summaryProp,
    columnsProp,
  });

  // Fullscreen state + Alt+F shortcut (external prop wins if provided)
  const { fullScreen, handleToggleFullScreen } = useFullScreenToggle(externalFullScreen);

  // Insights collapse state (owned here; toggle button lives in the top bar)
  const { collapsed: insightsCollapsed, toggle: toggleInsights } = useInsightsCollapse(fullScreen);

  // Refs for measuring
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const firstRowRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // Detect sidebar width for fullscreen offset
  const sidebarWidth = useSidebarWidth(fullScreen);

  // Column widths (with manual-resize preservation)
  const { columnWidths, handleColumnResize } = useColumnWidths(columns);

  // Normalize columns and detect ones with identical values across all rows
  const normalizedColumns = useMemo(() => normalizeColumns(columns), [columns]);
  const {
    constantColumns,
    filteredColumns: columnsWithoutConstants,
    filteredRows: rowsWithoutConstants,
  } = useConstantColumns(rows, normalizedColumns);

  // Don't hide constant columns or show summary when there's only 1 row
  const shouldHideConstantColumns = hideConstantColumns && rows.length > 1;
  const columnsToUse = shouldHideConstantColumns ? columnsWithoutConstants : normalizedColumns;
  const rowsToUse = shouldHideConstantColumns ? rowsWithoutConstants : rows;

  // Whether the insights panel has anything to render (drives the top-bar toggle visibility)
  const insightsAvailable = Boolean(
    (summary && Object.keys(summary).length > 0) ||
      (shouldHideConstantColumns && constantColumns && constantColumns.size > 0)
  );

  // Column visibility
  const { columnVisibility, toggleColumnVisibility, setColumnVisibilityState } =
    useColumnVisibility(columnsToUse, initialColumnVisibility, onColumnVisibilityChange);

  // Column order + derived visible columns
  const { columnOrder, setColumnOrder, handleColumnReorder, visibleColumns } =
    useColumnOrder(columnsToUse, columnVisibility);

  // Frozen columns (initial setup seeded from prop)
  const {
    frozenState,
    toggleFrozen,
    setFrozenStateState,
    frozenColumns: computedFrozenColumns,
    nonFrozenColumns,
    cumulativeFrozenLeftOffsets,
  } = useFrozenColumns(columnsToUse, visibleColumns, columnWidths, frozenColumns);

  // Sorting
  const { sortModel, handleHeaderClick, setSortModelProgrammatic } = useSorting(
    initialSortModel,
    onSortModelChange
  );

  // Filtering
  const { filterModel, handleFilterChange, clearAllFilters } = useFiltering();
  const hasActiveFilters = useMemo(
    () =>
      Object.entries(filterModel).some(
        ([, value]) => value != null && value !== ""
      ),
    [filterModel]
  );

  // Pipeline: index → filter → sort
  const indexedRows = useMemo(() => indexRows(rowsToUse), [rowsToUse]);
  const filteredRows = useMemo(
    () => filterRows(indexedRows, filterModel, columnsToUse),
    [indexedRows, filterModel, columnsToUse]
  );
  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortModel, columnsToUse),
    [filteredRows, sortModel, columnsToUse]
  );

  // Grouping injects synthetic total rows between groups
  const { groupByField, toggleGroupBy, groupedRows } = useGrouping(
    columnsToUse,
    sortedRows,
    setSortModelProgrammatic
  );

  // Pagination (disabled in fullscreen)
  const visibleColumnCount = visibleColumns.length || 1;
  const { page, totalPages, autoPageSize, pagedRows, goToNextPage, goToPrevPage } =
    usePagination(groupedRows, visibleColumnCount, fullScreen);

  // Scroll-to-top button (only appears when the bottom toolbar triggered paging)
  const {
    showScrollToTop,
    handleScrollToTop,
    handleTopGoToNextPage,
    handleTopGoToPrevPage,
    handleBottomGoToNextPage,
    handleBottomGoToPrevPage,
  } = useScrollToTopOnPagination({ page, fullScreen, goToNextPage, goToPrevPage });

  // Row selection (click + hover)
  const { selectedRowId, hoveredRowId, handleRowClick, handleRowHover, handleRowLeave } =
    useRowSelection(onRowSelect);

  // Measurements (row height + container height)
  const { rowHeight, computedContainerHeight } = useMeasurements(
    headerRef,
    firstRowRef,
    pagedRows,
    visibleColumns,
    density,
    true, // autoHeight is always forced true; see legacy note
    height,
    fullScreen
  );

  // Virtual scrolling only in fullscreen
  const scrollContainerHeight = useScrollContainerHeight(
    fullScreen,
    scrollAreaRef,
    computedContainerHeight
  );
  const virtualScrollingResult = useVirtualScrolling(
    fullScreen ? groupedRows : [],
    rowHeight,
    scrollContainerHeight,
    scrollAreaRef.current,
    10 // overscan
  );
  const displayRows = fullScreen ? virtualScrollingResult.visibleRows : pagedRows;

  // Export payload / imperative handle / Excel handler. The last block of
  // params is only consulted when `tabs` has 2+ entries — they let the export
  // re-run the pipeline per tab so every tab becomes its own Excel sheet.
  const { isExcelExporting, handleExcelExport, getExportPayload } = useGridExport({
    ref,
    groupedRows,
    sortedRows,
    visibleColumns,
    summary,
    constantColumns,
    showTotalRow,
    onExcelExport,
    exportReport,
    tabs,
    rowsProp,
    columnsProp,
    summaryProp,
    filterModel,
    sortModel,
    columnVisibility,
    hideConstantColumns,
  });

  // Menus
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Layout apply (shared between manual LayoutMenu and the auto-loader)
  const applyLayout = useCallback(
    (columnConfig) => {
      if (!columnConfig || !Array.isArray(columnConfig)) return;
      const {
        columnVisibility: newVisibility,
        frozenState: newFrozenState,
        columnOrder: newOrder,
      } = applyColumnConfig(normalizedColumns, columnConfig);

      setColumnVisibilityState(newVisibility);
      setFrozenStateState(newFrozenState);

      if (newOrder && newOrder.length > 0) {
        setColumnOrder(newOrder);
      }
    },
    [normalizedColumns, setColumnVisibilityState, setFrozenStateState, setColumnOrder]
  );

  // Auto-load the user's default layout on mount (once per documentName)
  useDefaultLayoutLoader({ documentName, columns, normalizedColumns, applyLayout });

  // Container style (accounts for fullscreen + sidebar offset)
  const gridContainerStyle = getGridContainerStyle(
    computedContainerHeight,
    fullScreen,
    sidebarWidth
  );

  // Header chrome shared by the empty and populated states.
  const tabsAndInsights = (
    <>
      <GridTabs
        tabs={hasTabs ? tabs : null}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        insightsAvailable={insightsAvailable}
        insightsCollapsed={insightsCollapsed}
        onToggleInsights={toggleInsights}
      />
      {!insightsCollapsed && (
        <InsightsPanel
          summary={summary}
          columns={columns}
          constantColumns={constantColumns}
          showCommonValues={shouldHideConstantColumns}
        />
      )}
    </>
  );

  // Empty state
  if (!rowsToUse || rowsToUse.length === 0 || visibleColumns.length === 0) {
    return (
      <div ref={containerRef} style={gridContainerStyle}>
        {tabsAndInsights}
        <EmptyState />
      </div>
    );
  }

  // Main render
  return (
    <div ref={containerRef} style={gridContainerStyle}>
      {tabsAndInsights}
      <Toolbar
        totalRows={groupedRows.length}
        visibleColumnsCount={visibleColumns.length}
        setShowColumnMenu={setShowColumnMenu}
        showColumnMenu={showColumnMenu}
        showLayoutMenu={showLayoutMenu}
        setShowLayoutMenu={setShowLayoutMenu}
        documentName={documentName}
        page={page}
        totalPages={totalPages}
        autoPageSize={autoPageSize}
        goToPrevPage={handleTopGoToPrevPage}
        goToNextPage={handleTopGoToNextPage}
        fullScreen={fullScreen}
        onToggleFullScreen={externalFullScreen !== undefined ? null : handleToggleFullScreen}
        position="top"
        showExcelExport={showExcelExport}
        onExcelExport={handleExcelExport}
        isExcelExporting={isExcelExporting}
        hasData={groupedRows.length > 0}
        getExportPayload={getExportPayload}
        renderToolbarExtras={renderToolbarExtras}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
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
          columnOrder={columnOrder}
          sortModel={sortModel}
          onLayoutLoad={applyLayout}
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
            groupByField={groupByField}
            toggleGroupBy={toggleGroupBy}
            onColumnReorder={handleColumnReorder}
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
            allColumns={columnsToUse}
            evenRowColor={evenRowColor}
            oddRowColor={oddRowColor}
          />
        </table>
      </div>
      {!fullScreen && (
        <Toolbar
          totalRows={groupedRows.length}
          visibleColumnsCount={visibleColumns.length}
          setShowColumnMenu={setShowColumnMenu}
          showColumnMenu={showColumnMenu}
          showLayoutMenu={showLayoutMenu}
          setShowLayoutMenu={setShowLayoutMenu}
          documentName={documentName}
          page={page}
          totalPages={totalPages}
          autoPageSize={autoPageSize}
          goToPrevPage={handleBottomGoToPrevPage}
          goToNextPage={handleBottomGoToNextPage}
          fullScreen={fullScreen}
          onToggleFullScreen={externalFullScreen !== undefined ? null : handleToggleFullScreen}
          position="bottom"
          showExcelExport={showExcelExport}
          onExcelExport={handleExcelExport}
          isExcelExporting={isExcelExporting}
          hasData={groupedRows.length > 0}
          getExportPayload={getExportPayload}
          renderToolbarExtras={renderToolbarExtras}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
        />
      )}
      {showScrollToTop && <GridScrollToTopButton onClick={handleScrollToTop} />}
    </div>
  );
});

NbNextDataGrid.displayName = "NbNextDataGrid";

NbNextDataGrid.propTypes = {
  rows: PropTypes.array,
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
      /** Optional: return the exact string to put in Excel when renderCell is custom */
      getExportValue: PropTypes.func,
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
  hideConstantColumns: PropTypes.bool,
  summary: PropTypes.object,
  evenRowColor: PropTypes.string,
  oddRowColor: PropTypes.string,
  showExcelExport: PropTypes.bool,
  exportReport: PropTypes.shape({ title: PropTypes.string, slug: PropTypes.string }),
  onExcelExport: PropTypes.func,
  renderToolbarExtras: PropTypes.func,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.node.isRequired,
      /** Optional palette key for the tab pill (see GridTabs COLOR_PALETTE). */
      color: PropTypes.string,
      /** Optional per-tab rows. If omitted, tab shares top-level `rows`. */
      rows: PropTypes.array,
      /** Optional per-tab summary. If omitted, tab shares top-level `summary`. */
      summary: PropTypes.object,
      /**
       * Optional. Field-name subset of top-level `columns` to show in this tab
       * (order follows this array). Lets multiple tabs share one row set while
       * showing different column groupings — no redundant row data needed.
       */
      columnFields: PropTypes.arrayOf(PropTypes.string),
      /** Optional. Full column override for this tab. Wins over `columnFields`. */
      columns: PropTypes.array,
    })
  ),
  defaultActiveTabId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export { NbNextDataGrid };
