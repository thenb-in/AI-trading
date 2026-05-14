import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';

import {
  fetchReportData,
  handleFiltersApply,
  processApiData,
  applyDefaultFiltersToSearchParams,
} from '@startup/components/base_report/ReportUtils';
import { NbNextDataGrid } from '@startup/components/nbnext_data_grid/NbNextDataGrid';
import { getInitialSortModel } from '@utils/getInitialSortModel';
import { BaseReportContext } from '@startup/context/BaseReportContext';
import { BaseReportLayout } from './BaseReportLayout';

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
 *     grid / layout / sibling overlays it needs. Use this for reports with
 *     interactive cells, tabs, sibling modals, etc.
 *
 *     ```jsx
 *     <BaseReport report={...} filtersConfig={...}>
 *       <MyCustomGridWrapper />
 *     </BaseReport>
 *
 *     // inside MyCustomGridWrapper:
 *     const { rows, columns, setRows, dataGridRef } = useBaseReportState();
 *     ```
 *
 * Caller-supplied contracts (no domain coupling here):
 *  - `filtersConfig` / `isFilterLoading` — caller decides which filter set + dynamic-options source.
 *  - `applyDefaultFilters` — seed search params from `report.defaultFilters` on mount.
 *
 * Default-grid only props (ignored when `children` is provided):
 *  - `documentName`, `frozenColumns`, `initialSortFallbackColumns`, `showTotalRow`.
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const dataGridRef = useRef(null);

  const isEditable = false;

  const defaultReportFilters = useMemo(() => ({ ...(report?.defaultFilters || {}) }), [report]);

  useEffect(() => {
    if (!applyDefaultFilters) return;
    applyDefaultFiltersToSearchParams(defaultReportFilters, searchParams, setSearchParams);
  }, [applyDefaultFilters, defaultReportFilters, searchParams, setSearchParams]);

  useEffect(() => {
    fetchReportData(
      report,
      locationState,
      setRows,
      setColumns,
      setLoading,
      setInitialLoad,
      () => {},
      setSearchParams,
      isEditable,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.title, locationState]);

  const onFiltersApply = (filters) => {
    handleFiltersApply(
      filters,
      report,
      setRows,
      setColumns,
      setLoading,
      setIsFiltering,
      setSearchParams,
      () => {},
      isEditable,
    );
  };

  useEffect(() => {
    if (locationState?.reportData && locationState?.columns) {
      const processed = processApiData(
        {
          columns: locationState.columns,
          data: locationState.reportData,
          status_definitions: locationState.statusDefinitions || {},
        },
        () => {},
        false,
      );
      setColumns(processed.gridColumns);
      setRows(processed.gridRows);
      setLoading(false);
      setInitialLoad(false);
    }
  }, [locationState]);

  const isLoadingData = loading || initialLoad;
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
    [rows, columns, isFiltering, isLoadingData],
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
