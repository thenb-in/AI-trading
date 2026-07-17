import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  applyDefaultFiltersToSearchParams,
  fetchReportData,
  handleFiltersApply,
} from '@startup/components/base_report/ReportUtils';
import { useFilterDynamicOptions } from '@startup/hooks/useFilterDynamicOptions';
import { useFilterConfig } from '@startup/components/base_filter/filterUtils';

/**
 * Owns the standard rows/columns/loading/isFiltering state plus default-filter
 * wiring, initial fetch, and on-filter-apply for grid-style reports. Each
 * caller supplies the filter definition (`filters`) and the dynamic-loaders
 * map (`dynamicLoaders`) — usually `FILTER_DYNAMIC_LOADERS` from the app's
 * filter config — and gets back the state, setters, and a ready-to-spread
 * `layoutProps` object for `<BaseReportLayout>`.
 *
 * Optional setters (`setOriginalColumns`, `setStatusDefinitions`) are
 * forwarded to fetchReportData.
 */
const useDataGridReport = ({
  report,
  locationState,
  filters,
  dynamicLoaders,
  isEditable = false,
  applyDefaultFilters: shouldApplyDefaultFilters = true,
  setOriginalColumns,
  setStatusDefinitions,
  // Optional caller-owned setters. Use these when the caller needs to apply
  // column customization (e.g. inject renderCell) atomically before columns
  // are set — pass an arity-2 setColumns(cols, rows) and fetchReportData /
  // handleFiltersApply will route updates through it.
  setColumns: externalSetColumns,
  setRows: externalSetRows,
  // Optional payload mapper for non-standard responses (e.g. multi-section
  // reports). When set, handleFiltersApply hands it the raw apiData instead of
  // running the default processApiData → setColumns/setRows path.
  applyData,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [internalRows, internalSetRows] = useState([]);
  const [internalColumns, internalSetColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const dataGridRef = useRef(null);

  const rows = externalSetRows ? undefined : internalRows;
  const columns = externalSetColumns ? undefined : internalColumns;
  const setRows = externalSetRows ?? internalSetRows;
  const setColumns = externalSetColumns ?? internalSetColumns;

  const defaultReportFilters = useMemo(
    () => ({ ...(report?.defaultFilters || {}) }),
    [report]
  );
  // When `filters` is omitted, the caller is supplying its own filtersConfig
  // from outside (e.g. BaseReport accepting it as a prop) — skip the work.
  const { dynamicOptions, isLoading: isFilterLoading } = useFilterDynamicOptions(filters ?? [], dynamicLoaders);
  const filtersConfig = useFilterConfig(filters ?? [], dynamicOptions);

  useEffect(() => {
    if (!shouldApplyDefaultFilters) return;
    applyDefaultFiltersToSearchParams(defaultReportFilters, searchParams, setSearchParams);
  }, [shouldApplyDefaultFilters, defaultReportFilters, searchParams, setSearchParams]);

  useEffect(() => {
    fetchReportData(
      report,
      locationState,
      setRows,
      setColumns,
      setLoading,
      setInitialLoad,
      setStatusDefinitions ?? (() => {}),
      setSearchParams,
      isEditable,
    );
  }, [report, locationState]);

  // fetchReportData seeds rows/columns from locationState; originalColumns is
  // a side channel some reports need for summary/lookup logic.
  useEffect(() => {
    if (locationState?.columns && setOriginalColumns) {
      setOriginalColumns(locationState.columns);
    }
  }, [locationState, setOriginalColumns]);

  // useFilterState fires this with the transport tag ('http' | 'runner');
  // handleFiltersApply picks the matching fetcher.
  const onFiltersApply = (nextFilters, transport = 'http') => {
    handleFiltersApply({
      filters: nextFilters,
      report,
      setRows,
      setColumns,
      setLoading,
      setIsFiltering,
      setSearchParams,
      setStatusDefinitions: setStatusDefinitions ?? (() => {}),
      hasStatusDefinitions: isEditable,
      setOriginalColumns: setOriginalColumns ?? null,
      transport,
      applyData,
    });
  };

  const isLoadingData = loading || initialLoad;

  return {
    rows,
    setRows,
    columns,
    setColumns,
    loading,
    setLoading,
    initialLoad,
    isFiltering,
    setIsFiltering,
    isFilterLoading,
    filtersConfig,
    onFiltersApply,
    dataGridRef,
    searchParams,
    setSearchParams,
    isLoadingData,
    layoutProps: { report, isFiltering, isLoadingData, filtersConfig, isFilterLoading, onFiltersApply },
  };
};

export { useDataGridReport };
