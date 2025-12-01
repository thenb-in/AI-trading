import { useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";

// Hooks
import { useSorting } from "./hooks/useSorting.js";
import { useColumnVisibility } from "./hooks/useColumnVisibility.js";
import { useFrozenColumns } from "./hooks/useFrozenColumns.js";
import { usePagination } from "./hooks/usePagination.js";
import { useRowSelection } from "./hooks/useRowSelection.js";
import { useMeasurements } from "./hooks/useMeasurements.js";

// Components
import { EmptyState } from "./components/EmptyState.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { ColumnMenu } from "./components/ColumnMenu.jsx";
import { DataGridHeader } from "./components/DataGridHeader.jsx";
import { DataGridBody } from "./components/DataGridBody.jsx";

// Utilities
import { normalizeColumns, indexRows, sortRows } from "./utils/helpers.js";
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
  autoHeight = true,
  onRowSelect = null,
}) {
  // Refs for measuring
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const firstRowRef = useRef(null);

  // Column widths state
  const [columnWidths, setColumnWidths] = useState(() => {
    const widths = {};
    columns.forEach(col => {
      if (col.width) widths[col.field] = col.width;
    });
    return widths;
  });

  // Column resize handler (to be implemented)
  const handleColumnResize = (field, newWidth) => {
    setColumnWidths(prev => ({ ...prev, [field]: newWidth }));
  };

  // Normalize columns
  const normalizedColumns = useMemo(() => normalizeColumns(columns), [columns]);

  // Column visibility hook
  const { columnVisibility, toggleColumnVisibility } = useColumnVisibility(
    normalizedColumns,
    initialColumnVisibility,
    onColumnVisibilityChange
  );

  // Visible columns
  const visibleColumns = useMemo(() => {
    return normalizedColumns.filter((c) => columnVisibility[c.field]);
  }, [normalizedColumns, columnVisibility]);

  // Frozen columns hook
  const { frozenState, toggleFrozen, frozenColumns, nonFrozenColumns, cumulativeFrozenLeftOffsets } =
    useFrozenColumns(normalizedColumns, visibleColumns);

  // Sorting hook
  const { sortModel, handleHeaderClick } = useSorting(initialSortModel, onSortModelChange);

  // Index and sort rows
  const indexedRows = useMemo(() => indexRows(rows), [rows]);
  const sortedRows = useMemo(
    () => sortRows(indexedRows, sortModel, normalizedColumns),
    [indexedRows, sortModel, normalizedColumns]
  );

  // Pagination hook
  const visibleColumnCount = visibleColumns.length || 1;
  const { page, totalPages, autoPageSize, pagedRows, goToNextPage, goToPrevPage } = usePagination(
    sortedRows,
    visibleColumnCount
  );

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
    height
  );

  // Column menu state
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Compute styles
  const gridContainerStyle = getGridContainerStyle(computedContainerHeight);

  // Empty state
  if (!rows || rows.length === 0 || visibleColumns.length === 0) {
    return (
      <EmptyState/>
    );
  }

  // Main render
  return (
    <div ref={containerRef}  style={gridContainerStyle}>
      <Toolbar
        totalRows={rows.length}
        visibleColumnsCount={visibleColumns.length}
        showColumnMenu={showColumnMenu}
        setShowColumnMenu={setShowColumnMenu}
        page={page}
        totalPages={totalPages}
        autoPageSize={autoPageSize}
        goToPrevPage={goToPrevPage}
        goToNextPage={goToNextPage}
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
      <div style={scrollAreaStyle}>
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
          />
          <DataGridBody
            firstRowRef={firstRowRef}
            pagedRows={pagedRows}
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
};

export { NbNextDataGrid };
