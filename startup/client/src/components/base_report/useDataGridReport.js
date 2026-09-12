import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { fetchReportData } from '@startup/components/base_report/ReportUtils';
import {
  applyDefaultFiltersToSearchParams,
  filterValuesFromParams,
  serializeFilterValues,
} from '@startup/components/base_filter/filter/helpers';
import { getYesterdayYmd } from '@utils/dateTimeUtils';
import {
  handleFiltersApply,
  loadSavedReportRun,
} from '@startup/components/base_report/reportDataSources';
import { SAVED_RUN_PARAM } from '@startup/constants/reportRuns';
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
 * Optional setters (`setOriginalColumns`, `setStatusDefinitions`) are forwarded
 * to fetchReportData.
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


  const appliedFiltersJson = JSON.stringify({
    ...defaultReportFilters,
    ...serializeFilterValues(
      filtersConfig,
      filterValuesFromParams(filtersConfig, searchParams, (name) => searchParams.get(name) || getYesterdayYmd())
    ),
  });
  const appliedFilters = useMemo(() => JSON.parse(appliedFiltersJson), [appliedFiltersJson]);

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

  // ?runId= means "show this saved run". Lives here rather than in each report
  // so every report page opens a saved result — and the "report ready"
  // notification's deep link — without its own wiring. Keyed on the id alone:
  // loadSavedReportRun writes the run's filters back into the URL, and re-running
  // on every param change would fight that.
  //
  // loadedRunRef makes the load happen exactly once per id. A saved payload can
  // be megabytes, so a second fetch is not a wasted round trip — it is the whole
  // report downloaded and parsed again, with two writes racing to the grid.
  // StrictMode's double-invoke is what exposed this in dev; the guard is what
  // makes the effect idempotent everywhere.
  const savedRunId = searchParams.get(SAVED_RUN_PARAM);
  const loadedRunRef = useRef(null);
  useEffect(() => {
    if (!savedRunId || loadedRunRef.current === savedRunId) return;
    loadedRunRef.current = savedRunId;
    loadSavedReportRun({
      runId: savedRunId,
      setRows,
      setColumns,
      setLoading,
      setInitialLoad,
      setStatusDefinitions: setStatusDefinitions ?? (() => {}),
      hasStatusDefinitions: isEditable,
      setOriginalColumns: setOriginalColumns ?? null,
      applyData,
      setSearchParams,
    });
  }, [savedRunId]);

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
    appliedFilters,
    searchParams,
    setSearchParams,
    isLoadingData,
    layoutProps: { report, isFiltering, isLoadingData, filtersConfig, isFilterLoading, onFiltersApply },
  };
};

export { useDataGridReport };
