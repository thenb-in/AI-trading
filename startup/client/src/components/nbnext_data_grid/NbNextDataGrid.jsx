import { useMemo, useState, useRef, useCallback, forwardRef } from "react";
import PropTypes from "prop-types";

// Hooks
import { useSorting } from "./hooks/useSorting.js";
import { useColumnVisibility } from "./hooks/useColumnVisibility.js";
import { useFrozenColumns } from "./hooks/useFrozenColumns.js";
import { usePagination } from "./hooks/usePagination.js";
import { useRowSelection } from "./hooks/useRowSelection.js";
import { useMultiRowSelection } from "./hooks/useMultiRowSelection.js";
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
import { useInfiniteScroll } from "./hooks/useInfiniteScroll.js";
import { useGridTheme } from "./hooks/useGridTheme.js";
import { useGridViewMode } from "./hooks/useGridViewMode.js";

// Components
import { EmptyState } from "./components/EmptyState.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { ColumnMenu } from "./components/ColumnMenu.jsx";
import { LayoutMenu } from "./components/layout/LayoutMenu.jsx";
import { DataGridHeader } from "./components/DataGridHeader.jsx";
import { DataGridBody } from "./components/DataGridBody.jsx";
import { CardView } from "./components/CardView.jsx";
import { InsightsPanel } from "./components/InsightsPanel.jsx";
import { GridTabs } from "./components/GridTabs.jsx";
import { GridScrollToTopButton } from "./components/GridScrollToTopButton.jsx";

// Utilities
import { normalizeColumns, indexRows, filterRows, sortRows, applyColumnConfig, getKeyForRow, calculateIsSummaryTotals } from "./utils/helpers.js";
import { getGridContainerStyle, scrollAreaStyle, tableStyle } from "./utils/styles.js";


const NbNextDataGrid = forwardRef(({
  rows: rowsProp = [],
  columns: columnsProp = [],
  initialSortModel = [],
  onSortModelChange = null,
  initialColumnVisibility = null,
  onColumnVisibilityChange = null,
  getRowId = null,
  density = "comfortable",
  autoHeight = false,
  onRowSelect = null,
  /**
   * Fires on every row click with `(row, rowId)` — no toggle-deselect
   * semantics, unlike onRowSelect. Use when consumers need a click handler
   * (e.g. row-click-to-edit) that fires every time.
   */
  onRowClick = null,
  documentName = null,
  fullScreen: externalFullScreen,
  showTotalRow = false,
  frozenColumns = [],
  hideConstantColumns = true,
  /**
   * Excel export only. When false (default), columns with the same value on
   * every row are moved to the top summary block and omitted from the data table.
   * When true, only the `summary` prop appears at the top; constant columns
   * export as normal table columns (same value repeated per row).
   */
  showInsightsAsHeader = false,
  /**
   * Excel export only. When false (default), columns with no data in any row are
   * omitted from the export. When true, all visible export columns are included
   * even when every cell is empty.
   */
  showEmptyColumns = false,
  summary: summaryProp = null,
  /** Theme id from utils/themes.js — "report" (default) or "master". */
  theme = "report",
  /**
   * Layout mode — "auto" (default: cards on <640px, table otherwise), "table", or "cards".
   * Users can flip between table and cards via the bottom toolbar regardless of this default.
   */
  viewMode: viewModeProp = "auto",
  showExcelExport = false,
  /** { title, slug } for default Excel export. When provided (and onExcelExport not set), grid uses built-in handleExport. */
  exportReport = null,
  /**
   * Optional. When provided, Excel button calls this with payload: { rows, columns, summary, constantColumns } (grid data).
   * Use this when your report has a different data/response structure: pass your own rows/columns to handleExport.
   * Example: onExcelExport={async (payload) => { await handleExport({ title, slug }, myRows, myColumns, window.location.href, mySummary, payload.constantColumns, payload.totalRow, payload.showInsightsAsHeader, payload.showEmptyColumns); }}
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
  /**
   * Optional. Field name to group rows by on first render. After mount, the
   * user can still toggle grouping via the column menu — this only seeds the
   * initial state. Pass `null`/omit to start ungrouped (default).
   */
  defaultGroupByField = null,
  /**
   * Optional infinite scroll. When enabled the grid renders all loaded rows
   * (no internal pagination) and observes a sentinel at the bottom of its
   * scroll area; on intersection it calls `onLoadMore()` if `hasMore` is
   * true and `isLoadingMore` is false. The parent owns the row array and
   * appends as new pages arrive.
   */
  infiniteScroll = false,
  hasMore = false,
  onLoadMore = null,
  isLoadingMore = false,
  /**
   * Optional multi-row selection (checkbox column). Off by default.
   * When enabled, a leading sticky checkbox column is rendered and selection
   * state is exposed via `onSelectionChange(selectedIds)`. Pass `selectedRowIds`
   * for controlled mode, or omit it for uncontrolled mode.
   *
   * Select-all toggles only currently displayed (filtered/paged) rows; ids
   * selected on prior pages are preserved unless the consumer clears them.
   */
  enableRowSelection = false,
  selectedRowIds = null,
  onSelectionChange = null,
  selectionColumnWidth = 40,
  /**
   * Optional. Embed-friendly mode for grids placed in tight containers (e.g.
   * inside a popup). Drops the bottom toolbar, removes the container's own
   * border/radius/shadow so it sits flush inside its parent, and seeds the
   * insights panel as collapsed. Top toolbar (export, column menu) stays;
   * the user can still expand insights via its top-bar toggle.
   */
  minimalMode = false,
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

  // Theme (CSS variables on the container drive all themed colors)
  const { theme: activeTheme, cycleTheme } = useGridTheme(theme);

  // View mode: table vs cards (auto-switches on mobile, user can override).
  const { viewMode, cycleViewMode } = useGridViewMode(viewModeProp);

  // Fullscreen state + Alt+F shortcut (external prop wins if provided)
  const { fullScreen, handleToggleFullScreen } = useFullScreenToggle(externalFullScreen);

  // Insights collapse state (owned here; toggle button lives in the top bar)
  const { collapsed: insightsCollapsed, toggle: toggleInsights } = useInsightsCollapse(fullScreen, minimalMode);

  // Refs for measuring
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const firstRowRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  // Wraps GridTabs + InsightsPanel so its height feeds the container auto-size.
  const insightsRef = useRef(null);

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

  // Caller-supplied `summary` wins. When the caller doesn't pass one but the
  // columns themselves carry `is_summary: true` flags (server-curated picks),
  // build the summary from those — so reports that already opt into the
  // is_summary contract on the server get a top Summary card for free.
  const effectiveSummary = useMemo(() => {
    if (summary && Object.keys(summary).length > 0) return summary;
    const flagged = calculateIsSummaryTotals(rows, normalizedColumns);
    return Object.keys(flagged).length > 0 ? flagged : null;
  }, [summary, rows, normalizedColumns]);

  // Whether the insights panel has anything to render (drives the top-bar toggle visibility)
  const insightsAvailable = Boolean(
    (effectiveSummary && Object.keys(effectiveSummary).length > 0) ||
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
  const { sortModel, handleHeaderClick, promoteToPrimarySort } = useSorting(
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
    promoteToPrimarySort,
    defaultGroupByField
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
    useRowSelection(onRowSelect, onRowClick);

  // Multi-row selection (checkbox column)
  const multiRowSelection = useMultiRowSelection({
    enabled: enableRowSelection,
    selectedRowIds,
    onSelectionChange,
  });

  // Measurements (row height + container height)
  const { rowHeight, computedContainerHeight } = useMeasurements(
    headerRef,
    firstRowRef,
    pagedRows,
    visibleColumns,
    density,
    autoHeight,
    fullScreen,
    insightsRef
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
  // Infinite scroll bypasses internal pagination — render every loaded row;
  // the parent appends rows as more pages arrive.
  const displayRows = fullScreen
    ? virtualScrollingResult.visibleRows
    : infiniteScroll
      ? groupedRows
      : pagedRows;

  useInfiniteScroll({
    enabled: infiniteScroll,
    rootRef: scrollAreaRef,
    sentinelRef: loadMoreSentinelRef,
    hasMore,
    isLoadingMore,
    onLoadMore,
  });

  // Selection prop bundle for header/body. Visible-row ids drive select-all so
  // the checkbox reflects only what's currently displayed (post-filter, post-page).
  const visibleSelectableIds = useMemo(() => {
    if (!enableRowSelection) return [];
    const ids = [];
    for (let i = 0; i < displayRows.length; i++) {
      const wrapped = displayRows[i];
      const row = wrapped?._row;
      if (!row || row._isGroupTotal === true || row._isDisabled === true) continue;
      ids.push(getKeyForRow(row, wrapped._origIndex, getRowId));
    }
    return ids;
  }, [enableRowSelection, displayRows, getRowId]);

  const { allSelected, someSelected } = multiRowSelection.getSelectionState(visibleSelectableIds);

  const handleToggleAllVisible = useCallback(() => {
    multiRowSelection.toggleAll(visibleSelectableIds);
  }, [multiRowSelection, visibleSelectableIds]);

  const headerSelectionProp = enableRowSelection
    ? {
        enabled: true,
        columnWidth: selectionColumnWidth,
        allSelected,
        someSelected,
        onToggleAll: handleToggleAllVisible,
      }
    : null;

  const bodySelectionProp = enableRowSelection
    ? {
        enabled: true,
        columnWidth: selectionColumnWidth,
        isSelected: multiRowSelection.isSelected,
        onToggleRow: multiRowSelection.toggleRow,
      }
    : null;

  // Export payload / imperative handle / Excel handler. The last block of
  // params is only consulted when `tabs` has 2+ entries — they let the export
  // re-run the pipeline per tab so every tab becomes its own Excel sheet.
  const { isExcelExporting, handleExcelExport, getExportPayload } = useGridExport({
    ref,
    groupedRows,
    sortedRows,
    visibleColumns,
    normalizedColumns,
    columnOrder,
    summary,
    constantColumns,
    showTotalRow,
    showInsightsAsHeader,
    showEmptyColumns,
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

  // Container style (accounts for fullscreen + sidebar offset) + theme vars.
  // Default to natural document flow (container auto-sizes, page scrolls).
  // The legacy fixed-height layout was computed from `rowHeight × rowCount`
  // which silently omitted the filter row + total row + variable card height,
  // so the bottom toolbar would land before the last rows on table view and
  // clip cards on card view. Natural flow sidesteps the entire formula.
  //
  // Exceptions that still need a constrained, internally-scrolling area:
  //   - fullscreen: pinned 100vh layout with sticky chrome
  //   - infinite scroll: the IntersectionObserver sentinel needs a scrollable
  //     root, otherwise it'd report intersecting on every render
  const useNaturalFlow = !fullScreen && !infiniteScroll;
  const gridContainerStyle = {
    ...getGridContainerStyle(computedContainerHeight, fullScreen, sidebarWidth, minimalMode),
    ...(useNaturalFlow && {
      height: "auto",
      maxHeight: "none",
      overflow: "visible",
    }),
    ...activeTheme.vars,
  };
  const bodyScrollAreaStyle = useNaturalFlow
    ? { position: "relative", overflowX: "auto" }
    : scrollAreaStyle(fullScreen);

  const insightsHeader = (
    <div ref={insightsRef}>
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
          summary={effectiveSummary}
          columns={columns}
          constantColumns={constantColumns}
          showCommonValues={shouldHideConstantColumns}
        />
      )}
    </div>
  );

  // Empty state
  if (!rowsToUse || rowsToUse.length === 0 || visibleColumns.length === 0) {
    return (
      <div ref={containerRef} style={gridContainerStyle}>
        {insightsHeader}
        <EmptyState />
      </div>
    );
  }

  // Main render
  return (
    <div ref={containerRef} style={gridContainerStyle}>
      {insightsHeader}
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
        hidePagination={infiniteScroll}
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
      <div ref={scrollAreaRef} style={bodyScrollAreaStyle}>
        {viewMode === "cards" ? (
          <CardView
            rows={displayRows}
            columns={[...computedFrozenColumns, ...nonFrozenColumns]}
            selectedRowId={selectedRowId}
            handleRowClick={handleRowClick}
            getRowIdFunc={getRowId}
          />
        ) : (
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
              selection={headerSelectionProp}
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
              autoHeight={autoHeight}
              getRowIdFunc={getRowId}
              columnWidths={columnWidths}
              virtualScrolling={fullScreen}
              offsetY={fullScreen ? virtualScrollingResult.offsetY : 0}
              totalHeight={fullScreen ? virtualScrollingResult.totalHeight : 0}
              startIndex={fullScreen ? virtualScrollingResult.startIndex : 0}
              showTotalRow={showTotalRow}
              allRows={sortedRows}
              allColumns={columnsToUse}
              selection={bodySelectionProp}
            />
          </table>
        )}
        {infiniteScroll && (
          <div
            ref={loadMoreSentinelRef}
            className="flex items-center justify-center py-3 min-h-[40px]"
          >
            {isLoadingMore && (
              <span className="text-sm text-gray-500">Loading more records...</span>
            )}
            {!isLoadingMore && !hasMore && groupedRows.length > 0 && (
              <span className="text-sm text-gray-400">No more records to load.</span>
            )}
          </div>
        )}
      </div>
      {!fullScreen && !minimalMode && (
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
          hidePagination={infiniteScroll}
          themeLabel={activeTheme.label}
          onCycleTheme={cycleTheme}
          viewMode={viewMode}
          onCycleViewMode={cycleViewMode}
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
  initialSortModel: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      sort: PropTypes.oneOf(["asc", "desc"]).isRequired,
    })
  ),
  onSortModelChange: PropTypes.func,
  initialColumnVisibility: PropTypes.object,
  onColumnVisibilityChange: PropTypes.func,
  getRowId: PropTypes.func,
  density: PropTypes.oneOf(["compact", "standard", "comfortable"]),
  autoHeight: PropTypes.bool,
  onRowSelect: PropTypes.func,
  onRowClick: PropTypes.func,
  documentName: PropTypes.string,
  fullScreen: PropTypes.bool,
  showTotalRow: PropTypes.bool,
  frozenColumns: PropTypes.arrayOf(PropTypes.string),
  hideConstantColumns: PropTypes.bool,
  showInsightsAsHeader: PropTypes.bool,
  showEmptyColumns: PropTypes.bool,
  summary: PropTypes.object,
  theme: PropTypes.string,
  viewMode: PropTypes.oneOf(["auto", "table", "cards"]),
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
  defaultGroupByField: PropTypes.string,
  infiniteScroll: PropTypes.bool,
  hasMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  isLoadingMore: PropTypes.bool,
  enableRowSelection: PropTypes.bool,
  selectedRowIds: PropTypes.oneOfType([PropTypes.array, PropTypes.instanceOf(Set)]),
  onSelectionChange: PropTypes.func,
  selectionColumnWidth: PropTypes.number,
  minimalMode: PropTypes.bool,
};

export { NbNextDataGrid };
