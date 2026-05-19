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
 *     `initialSortFallbackColumns`, `showTotalRow`).
 *
 *  2. **Custom child** — pass a child component (typically a small wrapper).
 *     The child reads state via `useBaseReportState()` and renders whatever
 *     grid / layout / sibling overlays it needs.
 *
 * State / lifecycle delegated to `useDataGridReport`; the caller still owns
 * the filtersConfig (so different filter sets per report stay caller-driven).
 */
const BaseReport = ({
  report,
  locationState,
  documentName,
  filtersConfig,
  isFilterLoading = false,
  applyDefaultFilters = false,
  frozenColumns = [],
  initialSortFallbackColumns,
  showTotalRow = false,
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
  } = useDataGridReport({
    report,
    locationState,
    applyDefaultFilters,
  });

  const initialSortModel = getInitialSortModel(columns, initialSortFallbackColumns);

  const contextValue = useMemo(
    () => ({
      rows,
      columns,
      setRows,
      setColumns,
      isFiltering,
      isLoadingData,
      dataGridRef,
    }),
    [rows, columns, setRows, setColumns, isFiltering, isLoadingData, dataGridRef],
  );

  return (
    <BaseReportLayout
      report={report}
      isFiltering={isFiltering}
      isLoadingData={isLoadingData}
      filtersConfig={filtersConfig}
      isFilterLoading={isFilterLoading}
      onFiltersApply={onFiltersApply}
    >
      <BaseReportContext.Provider value={contextValue}>
        {children ?? (
          <NbNextDataGrid
            ref={dataGridRef}
            rows={rows}
            columns={columns}
            initialSortModel={initialSortModel}
            documentName={documentName}
            showTotalRow={showTotalRow}
            frozenColumns={frozenColumns}
            showExcelExport
            exportReport={{ title: report?.title, slug: report?.slug }}
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
  filtersConfig: PropTypes.array,
  isFilterLoading: PropTypes.bool,
  applyDefaultFilters: PropTypes.bool,
  frozenColumns: PropTypes.arrayOf(PropTypes.string),
  initialSortFallbackColumns: PropTypes.arrayOf(PropTypes.string),
  showTotalRow: PropTypes.bool,
  children: PropTypes.node,
};

export { BaseReport };
