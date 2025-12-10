import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { ApiService } from "../../../services/startup/ApiService.js";
import { ArrowUp } from "lucide-react";

// Hooks
import { useSorting } from "./hooks/useSorting.js";
import { useColumnVisibility } from "./hooks/useColumnVisibility.js";
import { useFrozenColumns } from "./hooks/useFrozenColumns.js";
import { usePagination } from "./hooks/usePagination.js";
import { useRowSelection } from "./hooks/useRowSelection.js";
import { useMeasurements } from "./hooks/useMeasurements.js";
import { useFiltering } from "./hooks/useFiltering.js";

// Components
import { EmptyState } from "./components/EmptyState.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { ColumnMenu } from "./components/ColumnMenu.jsx";
import { LayoutMenu } from "./components/layout/LayoutMenu.jsx";
import { DataGridHeader } from "./components/DataGridHeader.jsx";
import { DataGridBody } from "./components/DataGridBody.jsx";
import { LargeDatasetWarningDialog } from "./components/LargeDatasetWarningDialog.jsx";

// Utilities
import { normalizeColumns, indexRows, filterRows, sortRows, applyColumnConfig } from "./utils/helpers.js";
import { getGridContainerStyle, scrollAreaStyle, tableStyle } from "./utils/styles.js";
import { FULL_SCREEN_WARNING_THRESHOLD } from "./utils/constants.js";


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
}) {
  // Internal state for fullscreen mode (can be controlled externally via prop)
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  // Use external fullScreen if provided, otherwise use internal state
  const fullScreen = externalFullScreen !== undefined ? externalFullScreen : internalFullScreen;
  
  // Force autoHeight to always be true, regardless of prop value
  // TODO: Remove this once we know why autoHeight is always being marked false
  const autoHeight = true;
  // Refs for measuring
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const firstRowRef = useRef(null);

  // Detect sidebar width for fullscreen mode
  const [sidebarWidth, setSidebarWidth] = useState(0);
  
  useEffect(() => {
    if (!fullScreen) {
      setSidebarWidth(0);
      return;
    }

    const detectSidebarWidth = () => {
      // Look for the sidebar element
      const sidebar = document.querySelector('.sidebar-container');
      if (sidebar) {
        const rect = sidebar.getBoundingClientRect();
        // Only count sidebar if it's visible (not hidden on mobile)
        if (rect.width > 0 && window.getComputedStyle(sidebar).display !== 'none') {
          setSidebarWidth(rect.width);
        } else {
          setSidebarWidth(0);
        }
      } else {
        setSidebarWidth(0);
      }
    };

    // Detect on mount and when fullscreen changes
    detectSidebarWidth();

    // Also listen for resize events
    window.addEventListener('resize', detectSidebarWidth);
    
    // Use MutationObserver to detect sidebar width changes (when collapsed/expanded)
    const observer = new MutationObserver(detectSidebarWidth);
    const sidebar = document.querySelector('.sidebar-container');
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }

    return () => {
      window.removeEventListener('resize', detectSidebarWidth);
      observer.disconnect();
    };
  }, [fullScreen]);

  // Helper function to calculate column width with minimum to fit layout
  const calculateColumnWidth = (col) => {
    // If width is explicitly provided, use it (should be total width including icons)
    if (col.width) {
      return col.width;
    }
    
    // Calculate base width as 2n+1 where n is number of characters in column name
    const columnName = col.headerName || col.field || '';
    const n = columnName.length;
    const baseWidth = 15 * n + 18;
    
    // Add icon space (sort icon + freeze icon)
    const sortIconWidth = col.sortable !== false ? 22 : 0;
    const freezeIconWidth = 32;
    const iconSpace = sortIconWidth + freezeIconWidth;
    
    // Calculate total width
    const totalWidth = baseWidth + iconSpace;
    
    // Ensure minimum width to fit layout (at least 80px total for readability)
    const minTotalWidth = 80;
    
    return Math.max(totalWidth, minTotalWidth);
  };

  // Column widths state
  const [columnWidths, setColumnWidths] = useState(() => {
    const widths = {};
    columns.forEach(col => {
      widths[col.field] = calculateColumnWidth(col);
    });
    return widths;
  });

  // Column resize handler (to be implemented)
  const handleColumnResize = (field, newWidth) => {
    setColumnWidths(prev => ({ ...prev, [field]: newWidth }));
  };

  // Recalculate column widths when columns change (preserve user-resized widths)
  useEffect(() => {
    setColumnWidths(prev => {
      const newWidths = { ...prev };
      columns.forEach(col => {
        // Only update if:
        // 1. Column has explicit width prop (override any previous resize) OR
        // 2. Column width hasn't been manually resized (not in prev state)
        if (col.width) {
          newWidths[col.field] = col.width;
        } else if (!(col.field in prev)) {
          newWidths[col.field] = calculateColumnWidth(col);
        }
      });
      return newWidths;
    });
  }, [columns]);

  // Normalize columns
  const normalizedColumns = useMemo(() => normalizeColumns(columns), [columns]);

  // Column visibility hook
  const { columnVisibility, toggleColumnVisibility, setColumnVisibilityState } = useColumnVisibility(
    normalizedColumns,
    initialColumnVisibility,
    onColumnVisibilityChange
  );

  // Visible columns
  const visibleColumns = useMemo(() => {
    return normalizedColumns.filter((c) => columnVisibility[c.field]);
  }, [normalizedColumns, columnVisibility]);

  // Frozen columns hook
  const { frozenState, toggleFrozen, setFrozenStateState, frozenColumns, nonFrozenColumns, cumulativeFrozenLeftOffsets } =
    useFrozenColumns(normalizedColumns, visibleColumns, columnWidths);

  // Sorting hook
  const { sortModel, handleHeaderClick } = useSorting(initialSortModel, onSortModelChange);

  // Filtering hook
  const { filterModel, handleFilterChange } = useFiltering();

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

  // Pagination hook - skip pagination in fullscreen mode
  const visibleColumnCount = visibleColumns.length || 1;
  const { page, totalPages, autoPageSize, pagedRows, goToNextPage, goToPrevPage } = usePagination(
    sortedRows,
    visibleColumnCount,
    fullScreen
  );

  // State to show scroll to top button when page changes from bottom toolbar
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const prevPageRef = useRef(page);
  const paginationSourceRef = useRef(null);

  // Wrapper functions to track which toolbar triggered pagination
  const handleGoToNextPage = useCallback((source) => {
    paginationSourceRef.current = source;
    goToNextPage();
  }, [goToNextPage]);

  const handleGoToPrevPage = useCallback((source) => {
    paginationSourceRef.current = source;
    goToPrevPage();
  }, [goToPrevPage]);

  // Callback functions for top toolbar
  const handleTopGoToNextPage = useCallback(() => {
    handleGoToNextPage('top');
  }, [handleGoToNextPage]);

  const handleTopGoToPrevPage = useCallback(() => {
    handleGoToPrevPage('top');
  }, [handleGoToPrevPage]);

  // Callback functions for bottom toolbar
  const handleBottomGoToNextPage = useCallback(() => {
    handleGoToNextPage('bottom');
  }, [handleGoToNextPage]);

  const handleBottomGoToPrevPage = useCallback(() => {
    handleGoToPrevPage('bottom');
  }, [handleGoToPrevPage]);

  // Show scroll to top button only when bottom toolbar changes pagination
  useEffect(() => {
    if (fullScreen) {
      setShowScrollToTop(false);
      prevPageRef.current = page;
      paginationSourceRef.current = null;
      return;
    }

    // Only show button if page actually changed (not on initial render) and it was from bottom toolbar
    if (page !== prevPageRef.current && prevPageRef.current !== undefined) {
      if (paginationSourceRef.current === 'bottom') {
        setShowScrollToTop(true);
      }
      paginationSourceRef.current = null;
    }
    prevPageRef.current = page;
  }, [page, fullScreen]);

  // Hide scroll to top button when user scrolls to top manually
  useEffect(() => {
    if (!fullScreen && showScrollToTop) {
      const handleScroll = () => {
        if (window.scrollY === 0) {
          setShowScrollToTop(false);
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [showScrollToTop, fullScreen]);

  // Handle scroll to top button click
  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowScrollToTop(false);
  }, []);

  // Use all rows in fullscreen mode, otherwise use paged rows
  const displayRows = fullScreen ? sortedRows : pagedRows;

  // Row selection hook
  const { selectedRowId, hoveredRowId, handleRowClick, handleRowHover, handleRowLeave } =
    useRowSelection(onRowSelect);

  // Measurements hook
  const { rowHeight, computedContainerHeight } = useMeasurements(
    headerRef,
    firstRowRef,
    displayRows,
    visibleColumns,
    density,
    autoHeight,
    height,
    fullScreen
  );

  // Column menu state
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Track if default layout has been applied per documentName (to prevent re-applying)
  const defaultLayoutAppliedRef = useRef({});

  // Handle layout load
  const handleLayoutLoad = (columnConfig) => {
    if (!columnConfig || !Array.isArray(columnConfig)) return;

    const { columnVisibility: newVisibility, frozenState: newFrozenState } = applyColumnConfig(
      normalizedColumns,
      columnConfig
    );

    // Apply column visibility
    setColumnVisibilityState(newVisibility);

    // Apply frozen state
    setFrozenStateState(newFrozenState);
  };

  // Auto-load default layout on mount
  useEffect(() => {
    // Reset tracking when documentName changes
    if (documentName) {
      // Clear tracking for previous documentName when switching reports
      Object.keys(defaultLayoutAppliedRef.current).forEach(key => {
        if (key !== documentName) {
          delete defaultLayoutAppliedRef.current[key];
        }
      });
    }

    const loadDefaultLayout = async () => {
      // Only load if documentName is provided
      if (!documentName) return;
      
      // Check if we've already applied default layout for this documentName
      if (defaultLayoutAppliedRef.current[documentName]) return;
      
      // Only load if columns are ready
      if (!normalizedColumns || normalizedColumns.length === 0) return;
      
      // Ensure columns array is also ready
      if (!columns || columns.length === 0) return;

      try {
        const response = await ApiService.getLayoutsByDocument(documentName);
        const layouts = response.data.data;
        
        // Find default layout in both private and public layouts
        const allLayouts = [...(layouts.private || []), ...(layouts.public || [])];
        const defaultLayout = allLayouts.find(layout => layout.is_default === true);
        
        if (defaultLayout && defaultLayout.column_config && Array.isArray(defaultLayout.column_config)) {
          // Mark as applied for this documentName to prevent re-applying
          defaultLayoutAppliedRef.current[documentName] = true;
          
          // Small delay to ensure state setters are ready
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Apply the default layout directly
          const { columnVisibility: newVisibility, frozenState: newFrozenState } = applyColumnConfig(
            normalizedColumns,
            defaultLayout.column_config
          );

          // Apply column visibility
          setColumnVisibilityState(newVisibility);

          // Apply frozen state
          setFrozenStateState(newFrozenState);
        } else {
          // No default layout found, mark as checked so we don't keep trying
          defaultLayoutAppliedRef.current[documentName] = true;
        }
      } catch (error) {
        // Silently fail - default layout is optional
        // Mark as checked even on error to prevent infinite retries
        defaultLayoutAppliedRef.current[documentName] = true;
        console.error('Error loading default layout:', error);
      }
    };

    loadDefaultLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentName, columns, normalizedColumns]);

  // Warning dialog state
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  // Fullscreen toggle handler
  const handleToggleFullScreen = useCallback(() => {
    // If already in fullscreen, exit without warning
    if (fullScreen) {
      setInternalFullScreen(false);
      return;
    }

    // Calculate total number of cells
    const totalCells = rows.length * visibleColumns.length;
    const warningThreshold = FULL_SCREEN_WARNING_THRESHOLD;

    // If cells exceed threshold, show warning dialog
    if (totalCells > warningThreshold) {
      setShowWarningDialog(true);
    } else {
      // Otherwise, proceed directly to fullscreen
      setInternalFullScreen(true);
    }
  }, [fullScreen, rows.length, visibleColumns.length]);

  // Handle warning dialog confirm
  const handleWarningConfirm = useCallback(() => {
    setShowWarningDialog(false);
    setInternalFullScreen(true);
  }, []);

  // Handle warning dialog cancel
  const handleWarningCancel = useCallback(() => {
    setShowWarningDialog(false);
  }, []);

  // Compute styles
  const gridContainerStyle = getGridContainerStyle(computedContainerHeight, fullScreen, sidebarWidth);

  // Empty state
  if (!rows || rows.length === 0 || visibleColumns.length === 0) {
    return (
      <EmptyState/>
    );
  }

  // Calculate total cells for warning dialog
  const totalCells = rows.length * visibleColumns.length;

  // Main render
  return (
    <div ref={containerRef}  style={gridContainerStyle}>
      <Toolbar
        totalRows={sortedRows.length}
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
          onLayoutLoad={(columnConfig) => handleLayoutLoad(columnConfig)}
          onClose={() => setShowLayoutMenu(false)}
        />
      )}
      {showWarningDialog && (
        <LargeDatasetWarningDialog
          isOpen={showWarningDialog}
          onConfirm={handleWarningConfirm}
          onCancel={handleWarningCancel}
          cellCount={totalCells}
        />
      )}
      <div style={scrollAreaStyle(fullScreen)}>
        <table style={tableStyle}>
          <DataGridHeader
            headerRef={headerRef}
            frozenColumns={frozenColumns}
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
            frozenColumns={frozenColumns}
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
          />
        </table>
      </div>
      <Toolbar
        totalRows={sortedRows.length}
        visibleColumnsCount={visibleColumns.length}
        setShowColumnMenu={setShowColumnMenu}
        page={page}
        totalPages={totalPages}
        autoPageSize={autoPageSize}
        goToPrevPage={handleBottomGoToPrevPage}
        goToNextPage={handleBottomGoToNextPage}
        fullScreen={fullScreen}
        onToggleFullScreen={externalFullScreen !== undefined ? null : handleToggleFullScreen}
        position="bottom"
      />
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
};

export { NbNextDataGrid };
