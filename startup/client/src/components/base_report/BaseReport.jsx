import PropTypes from 'prop-types';
import { useMemo } from 'react';

import { NbNextDataGrid } from '@startup/components/nbnext_data_grid/NbNextDataGrid';
import { getInitialSortModel } from '@utils/getInitialSortModel';
import { BaseReportContext } from '@startup/context/BaseReportContext';
import { BaseReportLayout } from './BaseReportLayout';
import { useDataGridReport } from './useDataGridReport';

/**
 * Generic report shell — chrome + filters + state + grid.
 *
 * Two modes:
 *
 *  1. **Default grid** — no children. BaseReport renders a standard
 *     `<NbNextDataGrid>` using the loaded rows/columns and the grid-related
 *     props on this component (`documentName`, `frozenColumns`,
 *     `initialSortFallbackColumns`, `showTotalRow`, `defaultGroupByField`).
 *
 *  2. **Custom child** — pass a child component (typically a small wrapper).
 *     The child reads state via `useBaseReportState()` and renders whatever
 *     grid / layout / sibling overlays it needs.
 *
 * State / lifecycle delegated to `useDataGridReport`. Pass the filter
 * definition as `filters` and the hook builds the config (dynamic options
 * included).
 */
const BaseReport = ({
  report,
  locationState,
  documentName,
  filters,
  applyDefaultFilters = false,
  frozenColumns = [],
  initialSortFallbackColumns,
  defaultSortField,
  defaultSortDirection = 'desc',
  decorateColumns,
  showTotalRow = false,
  defaultGroupByField = null,
  hideConstantColumns = true,
  showInsightsAsHeader = false,
  toolbar,
  children,
}) => {
  const {
    rows,
    setRows,
    columns,
    setColumns,
    isFiltering,
    onFiltersApply,
    dataGridRef,
    isLoadingData,
    filtersConfig,
  } = useDataGridReport({
    report,
    locationState,
    filters,
    applyDefaultFilters,
  });

  const gridColumns = useMemo(
    () => (decorateColumns ? decorateColumns(columns ?? []) : columns),
    [columns, decorateColumns],
  );

  const initialSortModel = useMemo(
    () => (defaultSortField && gridColumns?.some((column) => column.field === defaultSortField)
      ? [{ field: defaultSortField, sort: defaultSortDirection }]
      : getInitialSortModel(gridColumns, initialSortFallbackColumns)),
    [gridColumns, defaultSortField, defaultSortDirection, initialSortFallbackColumns],
  );

  const contextValue = useMemo(
    () => ({
      rows,
      columns: gridColumns,
      setRows,
      setColumns,
      isFiltering,
      isLoadingData,
      dataGridRef,
    }),
    [rows, gridColumns, setRows, setColumns, isFiltering, isLoadingData, dataGridRef],
  );

  return (
    <BaseReportLayout
      report={report}
      isFiltering={isFiltering}
      isLoadingData={isLoadingData}
      filtersConfig={filtersConfig}
      onFiltersApply={onFiltersApply}
    >
      <BaseReportContext.Provider value={contextValue}>
        {children ?? (
          <NbNextDataGrid
            ref={dataGridRef}
            rows={rows}
            columns={gridColumns}
            initialSortModel={initialSortModel}
            documentName={documentName}
            showTotalRow={showTotalRow}
            defaultGroupByField={defaultGroupByField}
            frozenColumns={frozenColumns}
            hideConstantColumns={hideConstantColumns}
            showInsightsAsHeader={showInsightsAsHeader}
            showExcelExport
            exportReport={{ title: report?.title, slug: report?.slug }}
            renderToolbarExtras={toolbar ? ({ position }) => (position === 'top' ? toolbar : null) : null}
          />
        )}
      </BaseReportContext.Provider>
    </BaseReportLayout>
  );
};

BaseReport.propTypes = {
  report: PropTypes.object.isRequired,
  locationState: PropTypes.object,
  documentName: PropTypes.string,
  /** Filter definition; BaseReport builds the filtersConfig from it. */
  filters: PropTypes.array,
  applyDefaultFilters: PropTypes.bool,
  frozenColumns: PropTypes.arrayOf(PropTypes.string),
  initialSortFallbackColumns: PropTypes.arrayOf(PropTypes.string),
  defaultSortField: PropTypes.string,
  defaultSortDirection: PropTypes.oneOf(['asc', 'desc']),
  decorateColumns: PropTypes.func,
  showTotalRow: PropTypes.bool,
  /** Field to group rows by on open — each group gets a subtotal row. User-toggleable from the header. */
  defaultGroupByField: PropTypes.string,
  /** false keeps same-value columns in the table instead of promoting them to the insights panel. */
  hideConstantColumns: PropTypes.bool,
  /** Excel export: write insights as a header block above the table. */
  showInsightsAsHeader: PropTypes.bool,
  /** Controls in the grid's top toolbar beside Export, e.g. a report's Print button. */
  toolbar: PropTypes.node,
  children: PropTypes.node,
};

export { BaseReport };
