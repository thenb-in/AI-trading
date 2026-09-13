import { useCallback, useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { hasAnyActiveFilter, inferColumnType } from "./utils/columnFilters";
import PropTypes from "prop-types";

// Hooks
import { useLayoutState } from "./hooks/useLayoutState.js";
import { usePagination } from "./hooks/usePagination.js";
import { useRowSelection } from "./hooks/useRowSelection.js";
import { useMultiRowSelection } from "./hooks/useMultiRowSelection.js";
import { useMeasurements } from "./hooks/useMeasurements.js";
import { useVirtualScrolling } from "./hooks/useVirtualScrolling.js";
import { useConstantColumns } from "./hooks/useConstantColumns.js";
import { useSidebarWidth } from "./hooks/useSidebarWidth.js";
import { useGrouping } from "./hooks/useGrouping.js";
import { useScrollToTopOnPagination } from "./hooks/useScrollToTopOnPagination.js";
import { useScrollContainerHeight } from "./hooks/useScrollContainerHeight.js";
import { useLayouts } from "./hooks/useLayouts.js";
import { useFullScreenToggle } from "./hooks/useFullScreenToggle.js";
import { useTabsState } from "./hooks/useTabsState.js";
import { useGridExport } from "./hooks/useGridExport.js";
import { useInsightsCollapse } from "./hooks/useInsightsCollapse.js";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll.js";
import { useGridTheme } from "./hooks/useGridTheme.js";
import { useGridViewMode } from "./hooks/useGridViewMode.js";
import { useArrowKeyScroll } from "./hooks/useArrowKeyScroll.js";

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
import {
  indexRows,
  filterRows,
  sortRows,
  unwrapGridRows,
  getKeyForRow,
  calculateIsSummaryTotals,
  calculateFrozenOffsets,
} from "./utils/helpers.js";
import { adaptLayoutConfig } from "./utils/layoutConfig.js";
import { getGridContainerStyle, scrollAreaStyle, tableStyle } from "./utils/styles.js";

const INFINITE_SCROLL_MAX_HEIGHT = 'calc(100vh - 180px)';

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
  /**
   * Optional `(row) => boolean`. Rows it accepts are drawn as the header of the section
   * they open — a rule above them and a tint — so a reader can see where one section
   * ends and the next begins. For views that stack several rows per entity (e.g. the
   * detailed attendance print view, which lists one row per parameter per employee).
   */
  isSectionHeaderRow = null,
  sectionHeaderRuleOnly = false,
  /**
   * `(row) => boolean`. Rows it returns true for are tinted red — for entries the
   * caller wants the reader to check before acting on them (a duplicate punch, say).
   */
  isAlertRow = null,
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
   * Optional `(rows) => void`. Called with the data rows in the order the grid
   * shows them — after column filters, sort and grouping, before paging — so a
   * consumer can step through records in that same order.
   */
  onVisibleRowsChange = null,
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

  // ── Layout state (L1 / L2 / L3) ─────────────────────────────────────────
  // Single source of truth for all column-level state: visibility, freeze,
  // order, widths, sort, and per-column filter. The hook produces a `merged`
  // render state by overlaying L1 (server) → L2 (saved layout) → L3 (manual).
  const {
    l1,
    l2,
    dirty,
    merged,
    toggleColumnVisibility,
    toggleFrozen,
    setColumnWidth,
    reorderColumns,
    handleHeaderClick,
    promoteToPrimarySort,
    setFilterValue,
    clearAllFilters,
    applyLayout: applyLayoutRaw,
    isLayoutActive: isLoadedLayout,
    buildSavePayload,
    applySavedSnapshot,
  } = useLayoutState({
    columnsProp: columns,
    initialSortModel,
    initialFrozenColumns: frozenColumns,
  });

  // Notify external listeners of merged visibility/sort changes. Keeps the
  // existing prop contract — consumers don't see L1/L2/L3.
  useEffect(() => {
    if (typeof onColumnVisibilityChange === "function") {
      onColumnVisibilityChange(merged.columnVisibility);
    }
  }, [merged.columnVisibility, onColumnVisibilityChange]);
  useEffect(() => {
    if (typeof onSortModelChange === "function") {
      onSortModelChange(merged.sortModel);
    }
  }, [merged.sortModel, onSortModelChange]);

  // Seed initial L2 from the legacy `initialColumnVisibility` prop. One-shot
  // per mount; subsequent column-set changes don't re-trigger. Callers that
  // don't pass the prop skip this entirely. Acts as a session-only L2 hide
  // seed (no DB roundtrip).
  const seededInitialVisibilityRef = useRef(false);
  useEffect(() => {
    if (seededInitialVisibilityRef.current) return;
    if (!initialColumnVisibility) return;
    if (l1.length === 0) return;
    seededInitialVisibilityRef.current = true;
    const byField = {};
    Object.keys(initialColumnVisibility).forEach((field) => {
      byField[field] = { hide: !initialColumnVisibility[field] };
    });
    applyLayoutRaw({ byField, order: null, sortModel: [], filterModel: null, savedFilters: false }, null);
  }, [initialColumnVisibility, l1, applyLayoutRaw]);

  // ── Layout list + default-layout auto-apply ─────────────────────────────
  const applyLayoutFromConfig = useCallback((rawConfig, layoutMeta = null) => {
    const adapted = adaptLayoutConfig(rawConfig);
    if (!adapted) return;
    applyLayoutRaw(adapted, layoutMeta);
  }, [applyLayoutRaw]);

  const {
    layouts,
    loading: layoutsLoading,
    error: layoutsError,
    refetch: refetchLayouts,
  } = useLayouts(documentName, applyLayoutFromConfig);

  const activeLayout = useMemo(() => {
    const all = [...(layouts.private || []), ...(layouts.public || [])];
    return all.find((l) => isLoadedLayout(l)) || null;
  }, [layouts, isLoadedLayout]);

  // ── Derived render set ──────────────────────────────────────────────────
  // The set of fields whose visibility is user-asserted (L2 or L3). Used to
  // gate constant-card promotion: only auto-promote columns the user hasn't
  // opined on. (L3-hide wins over card; L3-show wins too.)
  const assertedHideFields = useMemo(() => {
    const set = new Set();
    if (l2?.byField) {
      Object.keys(l2.byField).forEach((f) => {
        if (l2.byField[f]?.hide !== undefined) set.add(f);
      });
    }
    return set;
  }, [l2]);

  // shouldHideConstantColumns: don't auto-promote when there's a single row
  // (the table is already the "summary").
  const shouldHideConstantColumns = hideConstantColumns && rows.length > 1;

  const { constantColumns } = useConstantColumns(
    rows,
    shouldHideConstantColumns ? l1 : [],
    assertedHideFields
  );

  // Render columns = L1 reordered by merged.columnOrder, filtered to visible,
  // minus the constant-card fields (those move to the insights panel).
  const renderColumns = useMemo(() => {
    const byField = new Map(l1.map((c) => [c.field, c]));
    return merged.columnOrder
      .map((f) => byField.get(f))
      .filter(Boolean)
      .filter((c) => merged.columnVisibility[c.field])
      .filter((c) => !constantColumns.has(c.field));
  }, [l1, merged.columnOrder, merged.columnVisibility, constantColumns]);

  // For the column menu: show every L1 column the user can manage, except
  // those auto-promoted to the card (those have no per-column controls).
  const menuColumns = useMemo(() => {
    return l1.filter((c) => !constantColumns.has(c.field));
  }, [l1, constantColumns]);

  // Caller-supplied `summary` wins. When the caller doesn't pass one but the
  // columns themselves carry `is_summary: true` flags, build the summary
  // from those.
  const effectiveSummary = useMemo(() => {
    if (summary && Object.keys(summary).length > 0) return summary;
    const flagged = calculateIsSummaryTotals(rows, l1);
    return Object.keys(flagged).length > 0 ? flagged : null;
  }, [summary, rows, l1]);

  const insightsAvailable = Boolean(
    (effectiveSummary && Object.keys(effectiveSummary).length > 0) ||
      (shouldHideConstantColumns && constantColumns && constantColumns.size > 0)
  );

  // ── Pipeline: index → filter → sort ────────────────────────────────────
  const indexedRows = useMemo(() => indexRows(rows), [rows]);
  const filteredRows = useMemo(
    () => filterRows(indexedRows, merged.filterModel, l1),
    [indexedRows, merged.filterModel, l1]
  );

  const sortedRows = useMemo(() => {
    if (typeof isSectionHeaderRow !== "function") {
      return sortRows(filteredRows, merged.sortModel, l1);
    }
    const sections = [];
    filteredRows.forEach((wrapped) => {
      if (sections.length === 0 || isSectionHeaderRow(wrapped._row)) {
        sections.push([wrapped]);
        return;
      }
      sections[sections.length - 1].push(wrapped);
    });
    const heads = sections.map((section) => section[0]);
    const sortedHeads = sortRows(heads, merged.sortModel, l1);
    return sortedHeads.flatMap((head) => sections[heads.indexOf(head)]);
  }, [filteredRows, merged.sortModel, l1, isSectionHeaderRow]);

  useEffect(() => {
    if (typeof onVisibleRowsChange === "function") {
      onVisibleRowsChange(unwrapGridRows(sortedRows));
    }
  }, [sortedRows, onVisibleRowsChange]);

  // Grouping injects synthetic total rows between groups
  const { groupByField, toggleGroupBy, groupedRows } = useGrouping(
    l1,
    sortedRows,
    promoteToPrimarySort,
    defaultGroupByField,
    isSectionHeaderRow
  );

  // ── Frozen/non-frozen split + offsets ──────────────────────────────────
  const frozenColumnsRender = useMemo(
    () => renderColumns.filter((c) => merged.frozenState[c.field]),
    [renderColumns, merged.frozenState]
  );
  const nonFrozenColumnsRender = useMemo(
    () => renderColumns.filter((c) => !merged.frozenState[c.field]),
    [renderColumns, merged.frozenState]
  );
  const cumulativeFrozenLeftOffsets = useMemo(
    () => calculateFrozenOffsets(frozenColumnsRender, merged.columnWidths),
    [frozenColumnsRender, merged.columnWidths]
  );

  // ── Pagination (disabled in fullscreen) ────────────────────────────────
  const visibleColumnCount = renderColumns.length || 1;
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

  // ── Selection ──────────────────────────────────────────────────────────
  const { selectedRowId, hoveredRowId, handleRowClick, handleRowHover, handleRowLeave } =
    useRowSelection(onRowSelect, onRowClick);

  const multiRowSelection = useMultiRowSelection({
    enabled: enableRowSelection,
    selectedRowIds,
    onSelectionChange,
  });

  // ── Measurements + virtual scrolling ───────────────────────────────────
  const { rowHeight, computedContainerHeight } = useMeasurements(
    headerRef,
    firstRowRef,
    pagedRows,
    renderColumns,
    density,
    autoHeight,
    fullScreen,
    insightsRef
  );

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
    10
  );

  // In fullscreen, arrow keys drive the grid's scroll area (Left/Right scroll
  // horizontally across columns, Up/Down vertically). Disabled otherwise so the
  // page scrolls normally.
  useArrowKeyScroll(fullScreen, scrollAreaRef, rowHeight);

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

  // Selection prop bundle for header/body
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

  // ── Export ─────────────────────────────────────────────────────────────
  const { isExcelExporting, handleExcelExport, getExportPayload } = useGridExport({
    ref,
    groupedRows,
    sortedRows,
    visibleColumns: renderColumns,
    normalizedColumns: l1,
    columnOrder: merged.columnOrder,
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
    filterModel: merged.filterModel,
    sortModel: merged.sortModel,
    columnVisibility: merged.columnVisibility,
    hideConstantColumns,
    groupByField,
  });

  // ── Menus ──────────────────────────────────────────────────────────────
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Which operators each column's filter box should offer. Resolved here
  // because it needs the data: most grid columns declare no type, and a column
  // of amounts should offer "greater than" rather than "starts with".
  // Off `indexedRows` (pre-filter) so narrowing a column can't change the
  // operators it offers underneath the user.
  const columnFilterTypes = useMemo(() => {
    const types = {};
    l1.forEach((col) => {
      types[col.field] = inferColumnType(col, indexedRows);
    });
    return types;
  }, [l1, indexedRows]);

  // An "is set" / "is not set" column filters with an empty box, so activity
  // can't be read off the typed value alone.
  const hasActiveFilters = useMemo(
    () => hasAnyActiveFilter(merged.filterModel),
    [merged.filterModel]
  );

  // ── Container style ────────────────────────────────────────────────────
  const useNaturalFlow = !fullScreen && !infiniteScroll;
  const gridContainerStyle = {
    ...getGridContainerStyle(computedContainerHeight, fullScreen, sidebarWidth, minimalMode),
    ...(useNaturalFlow && {
      height: "auto",
      maxHeight: "none",
      overflow: "visible",
    }),
    ...(infiniteScroll && !fullScreen && { maxHeight: INFINITE_SCROLL_MAX_HEIGHT }),
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
  if (!rows || rows.length === 0 || renderColumns.length === 0) {
    return (
      <div ref={containerRef} style={gridContainerStyle}>
        {insightsHeader}
        <EmptyState />
      </div>
    );
  }

  const sharedToolbarProps = {
    totalRows: groupedRows.length,
    visibleColumnsCount: renderColumns.length,
    setShowColumnMenu,
    showColumnMenu,
    showLayoutMenu,
    setShowLayoutMenu,
    documentName,
    activeLayoutName: activeLayout?.layout_name || null,
    isLayoutDirty: dirty,
    page,
    totalPages,
    autoPageSize,
    fullScreen,
    onToggleFullScreen: externalFullScreen !== undefined ? null : handleToggleFullScreen,
    showExcelExport,
    onExcelExport: handleExcelExport,
    isExcelExporting,
    hasData: groupedRows.length > 0,
    getExportPayload,
    renderToolbarExtras,
    hasActiveFilters,
    onClearFilters: clearAllFilters,
    hidePagination: infiniteScroll,
  };

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={gridContainerStyle}>
      {insightsHeader}
      <Toolbar
        {...sharedToolbarProps}
        goToPrevPage={handleTopGoToPrevPage}
        goToNextPage={handleTopGoToNextPage}
        position="top"
      />
      {showColumnMenu && (
        <ColumnMenu
          normalizedColumns={menuColumns}
          columnVisibility={merged.columnVisibility}
          frozenState={merged.frozenState}
          toggleColumnVisibility={toggleColumnVisibility}
          toggleFrozen={toggleFrozen}
          onClose={() => setShowColumnMenu(false)}
        />
      )}
      {showLayoutMenu && documentName && (
        <LayoutMenu
          documentName={documentName}
          dirty={dirty}
          layouts={layouts}
          layoutsLoading={layoutsLoading}
          layoutsError={layoutsError}
          refetchLayouts={refetchLayouts}
          activeLayout={activeLayout}
          onLayoutLoad={applyLayoutFromConfig}
          buildSavePayload={buildSavePayload}
          onSavedSnapshot={applySavedSnapshot}
          onClose={() => setShowLayoutMenu(false)}
        />
      )}
      <div ref={scrollAreaRef} style={bodyScrollAreaStyle}>
        {viewMode === "cards" ? (
          <CardView
            rows={displayRows}
            columns={[...frozenColumnsRender, ...nonFrozenColumnsRender]}
            selectedRowId={selectedRowId}
            handleRowClick={handleRowClick}
            getRowIdFunc={getRowId}
            isAlertRow={isAlertRow}
          />
        ) : (
          <table style={tableStyle}>
            <DataGridHeader
              headerRef={headerRef}
              frozenColumns={frozenColumnsRender}
              nonFrozenColumns={nonFrozenColumnsRender}
              cumulativeFrozenLeftOffsets={cumulativeFrozenLeftOffsets}
              sortModel={merged.sortModel}
              frozenState={merged.frozenState}
              handleHeaderClick={handleHeaderClick}
              toggleFrozen={toggleFrozen}
              columnWidths={merged.columnWidths}
              handleColumnResize={setColumnWidth}
              fullScreen={fullScreen}
              filterModel={merged.filterModel}
              columnFilterTypes={columnFilterTypes}
              handleFilterChange={setFilterValue}
              groupByField={groupByField}
              toggleGroupBy={toggleGroupBy}
              onColumnReorder={reorderColumns}
              selection={headerSelectionProp}
            />
            <DataGridBody
              firstRowRef={firstRowRef}
              pagedRows={displayRows}
              frozenColumns={frozenColumnsRender}
              nonFrozenColumns={nonFrozenColumnsRender}
              cumulativeFrozenLeftOffsets={cumulativeFrozenLeftOffsets}
              selectedRowId={selectedRowId}
              hoveredRowId={hoveredRowId}
              handleRowClick={handleRowClick}
              handleRowHover={handleRowHover}
              handleRowLeave={handleRowLeave}
              rowHeight={rowHeight}
              autoHeight={autoHeight}
              getRowIdFunc={getRowId}
              columnWidths={merged.columnWidths}
              virtualScrolling={fullScreen}
              offsetY={fullScreen ? virtualScrollingResult.offsetY : 0}
              totalHeight={fullScreen ? virtualScrollingResult.totalHeight : 0}
              startIndex={fullScreen ? virtualScrollingResult.startIndex : 0}
              showTotalRow={showTotalRow}
              allRows={sortedRows}
              allColumns={l1}
              selection={bodySelectionProp}
              isSectionHeaderRow={isSectionHeaderRow}
              sectionHeaderRuleOnly={sectionHeaderRuleOnly}
              isAlertRow={isAlertRow}
              density={density}
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
          {...sharedToolbarProps}
          goToPrevPage={handleBottomGoToPrevPage}
          goToNextPage={handleBottomGoToNextPage}
          position="bottom"
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
  isSectionHeaderRow: PropTypes.func,
  sectionHeaderRuleOnly: PropTypes.bool,
  isAlertRow: PropTypes.func,
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
      color: PropTypes.string,
      rows: PropTypes.array,
      summary: PropTypes.object,
      columnFields: PropTypes.arrayOf(PropTypes.string),
      columns: PropTypes.array,
    })
  ),
  defaultActiveTabId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultGroupByField: PropTypes.string,
  infiniteScroll: PropTypes.bool,
  hasMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  isLoadingMore: PropTypes.bool,
  onVisibleRowsChange: PropTypes.func,
  enableRowSelection: PropTypes.bool,
  selectedRowIds: PropTypes.oneOfType([PropTypes.array, PropTypes.instanceOf(Set)]),
  onSelectionChange: PropTypes.func,
  selectionColumnWidth: PropTypes.number,
  minimalMode: PropTypes.bool,
};

export { NbNextDataGrid };
