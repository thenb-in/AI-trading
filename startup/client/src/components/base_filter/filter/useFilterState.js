import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { isDebugMode, subscribeToDebugMode } from '@services/debugModeService';
import { getYesterdayYmd } from '@utils/dateTimeUtils';
import { STORAGE_KEYS } from '../../../constants';
import { QUICK_DATE_ACTIONS } from './constants';
import {
  getDefaultForConfig,
  parseParamValue,
  serializeAppliedValue,
} from './helpers';

/**
 * Owns the filter form state, URL ↔ state sync, and every change handler
 * Filter.jsx wires into its inputs. Caller is responsible for layout only.
 */
const useFilterState = ({
  filtersConfig,
  onFilterChange,
  onFiltersApply,
  isLoading = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDebugFilters, setShowDebugFilters] = useState(() => isDebugMode());
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  // Unit ('month' | 'week' | 'day') the user last stepped in, or null before they touch
  // the quick-date bar — drives which presets stay prominent.
  const [quickDateGroup, setQuickDateGroup] = useState(null);
  const [isApplyingViaRunner, setIsApplyingViaRunner] = useState(false);
  const [debugReloadPrompt, setDebugReloadPrompt] = useState({
    show: false,
    debugEnabled: false,
  });
  const previousSearchParamsRef = useRef(searchParams.toString());
  const mountedRef = useRef(true);
  const hasAppliedRef = useRef(false);
  const lastTransportRef = useRef('http');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => subscribeToDebugMode((v) => {
    setShowDebugFilters(v);
    if (hasAppliedRef.current) {
      setDebugReloadPrompt({ show: true, debugEnabled: v });
    }
  }), []);

  const allFilters = useMemo(
    () => (showDebugFilters ? filtersConfig : filtersConfig.filter((f) => !f.debug)),
    [filtersConfig, showDebugFilters]
  );

  const getDefaultDateValue = useCallback(
    (dateParam) => searchParams.get(dateParam) || getYesterdayYmd(),
    [searchParams]
  );

  const computeFiltersFromParams = useCallback(() => {
    return allFilters.reduce((acc, config) => {
      const paramValue = searchParams.get(config.name);
      acc[config.name] = paramValue !== null
        ? parseParamValue(config, paramValue)
        : getDefaultForConfig(config, getDefaultDateValue);
      return acc;
    }, {});
  }, [searchParams, allFilters, getDefaultDateValue]);

  const [filters, setFilters] = useState(() => computeFiltersFromParams());

  // Sync state when URL changes externally (back/forward, programmatic nav, etc.)
  useEffect(() => {
    const current = searchParams.toString();
    if (current !== previousSearchParamsRef.current) {
      previousSearchParamsRef.current = current;
      setFilters(computeFiltersFromParams());
    }
  }, [searchParams, computeFiltersFromParams]);

  // Ensure filters has entries for any newly visible filter (e.g. after debug toggle).
  useEffect(() => {
    setFilters((prev) => {
      let changed = false;
      const merged = { ...prev };
      allFilters.forEach((config) => {
        if (!(config.name in merged)) {
          merged[config.name] = getDefaultForConfig(config, getDefaultDateValue);
          changed = true;
        }
      });
      return changed ? merged : prev;
    });
  }, [allFilters, getDefaultDateValue]);

  // Persist debug toggle across reloads.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.REPORT_FILTERS_DEBUG,
        showDebugFilters ? 'true' : 'false'
      );
    } catch {
      console.log('Failed to persist debug filters state');
    }
  }, [showDebugFilters]);

  const isDisabled = isApplyingFilters || isApplyingViaRunner;
  const isBusy = isApplyingFilters || isApplyingViaRunner || isLoading;

  const updateFilter = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    onFilterChange?.(name, value);
  }, [onFilterChange]);

  // `next` is a plain string for single-select filters, an array for multiselect.
  const handleSearchableChange = useCallback((config, next) => {
    if (isDisabled) return;
    if (!config.multiselect) {
      updateFilter(config.name, next || 'all');
      return;
    }
    const newValues = next;
    // Reconcile 'all' vs specifics so they're never both selected:
    // adding 'all' on top of specifics → keep only 'all';
    // adding a specific while 'all' was active → drop 'all'.
    const prev = filters[config.name];
    const prevArr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
    const allWasSelected = prevArr.includes('all');
    const allIsSelected = newValues.includes('all');

    let cleaned = newValues;
    if (!allWasSelected && allIsSelected) cleaned = ['all'];
    else if (allWasSelected && allIsSelected && newValues.length > 1) {
      cleaned = newValues.filter((v) => v !== 'all');
    }
    const isAllOnly = cleaned.length === 0 || (cleaned.length === 1 && cleaned[0] === 'all');
    updateFilter(config.name, isAllOnly ? 'all' : cleaned);
  }, [filters, isDisabled, updateFilter]);

  const handleDateChange = useCallback((name, date) => {
    if (isDisabled) return;
    if (!date || !isValid(date)) {
      updateFilter(name, '');
      return;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const clamped = date > today ? today : date;
    updateFilter(name, format(clamped, 'yyyy-MM-dd'));
  }, [isDisabled, updateFilter]);

  const handleCheckboxChange = useCallback((e) => {
    if (isDisabled) return;
    const { name, checked } = e.target;
    updateFilter(name, checked);
  }, [isDisabled, updateFilter]);

  // `getRange` is resolved against the latest filters so quick-date presets can step
  // back from the currently selected period instead of always anchoring on today.
  const applyDateRange = useCallback((getRange) => {
    setFilters((prev) => {
      const range = getRange({ start_date: prev.start_date, end_date: prev.end_date });
      const next = { ...prev };
      if (allFilters.some((f) => f.name === 'start_date')) {
        next.start_date = range.start_date;
        onFilterChange?.('start_date', range.start_date);
      }
      if (allFilters.some((f) => f.name === 'end_date')) {
        next.end_date = range.end_date;
        onFilterChange?.('end_date', range.end_date);
      }
      return next;
    });
  }, [allFilters, onFilterChange]);

  const quickDateActions = useMemo(() => {
    const currentRange = {
      start_date: filters.start_date,
      end_date: filters.end_date,
    };
    return QUICK_DATE_ACTIONS
      .filter(({ isVisible }) => !isVisible || isVisible(currentRange))
      .map(({ label, group, getRange, isVisible }) => ({
        label,
        // Once the user starts stepping through one unit, the other units' presets step
        // aside — still one click away, just no longer competing for attention.
        muted: Boolean(quickDateGroup) && group !== quickDateGroup,
        // Conditional presets mount mid-session, so they get an entrance animation.
        animateIn: Boolean(isVisible),
        onClick: () => {
          if (isDisabled) return;
          setQuickDateGroup(group);
          applyDateRange(getRange);
        },
      }));
  }, [filters.start_date, filters.end_date, quickDateGroup, isDisabled, applyDateRange]);

  const hasDateFilters = useMemo(
    () =>
      allFilters.some((f) => f.name === 'start_date' && f.type === 'date') &&
      allFilters.some((f) => f.name === 'end_date' && f.type === 'date'),
    [allFilters]
  );

  const writeValuesToParams = useCallback((appliedFilters) => {
    const newSearchParams = new URLSearchParams();
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (typeof value === 'boolean') {
        newSearchParams.set(key, value ? 'true' : 'false');
      } else if (Array.isArray(value)) {
        if (value.length > 0 && !(value.length === 1 && value[0] === 'all')) {
          newSearchParams.set(key, value.join(','));
        }
      } else {
        newSearchParams.set(key, value);
      }
    });
    setSearchParams(newSearchParams, { replace: true });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    if (isDisabled) return;
    const resetValues = allFilters.reduce((acc, config) => {
      acc[config.name] = getDefaultForConfig(config, getDefaultDateValue);
      return acc;
    }, {});
    setFilters(resetValues);
    setQuickDateGroup(null);
    Object.entries(resetValues).forEach(([k, v]) => onFilterChange?.(k, v));
    writeValuesToParams(resetValues);
  }, [allFilters, getDefaultDateValue, isDisabled, onFilterChange, writeValuesToParams]);

  const collectAppliedFilters = useCallback(() => {
    const appliedFilters = {};
    allFilters.forEach((config) => {
      const serialized = serializeAppliedValue(config, filters[config.name]);
      if (serialized !== undefined) appliedFilters[config.name] = serialized;
    });
    return appliedFilters;
  }, [allFilters, filters]);

  // Internal: drive one apply through the busy flag for its transport and
  // forward to the report's onFiltersApply callback with the transport tag.
  // 'http' goes to the app server's REST API; 'runner' goes through the
  // socket to the dedicated report-runner process.
  const doApply = useCallback(async (transport, setBusy) => {
    if (isDisabled) return;
    setBusy(true);
    try {
      const appliedFilters = collectAppliedFilters();
      writeValuesToParams(appliedFilters);
      await onFiltersApply?.(appliedFilters, transport);
      hasAppliedRef.current = true;
      lastTransportRef.current = transport;
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [collectAppliedFilters, isDisabled, onFiltersApply, writeValuesToParams]);

  const applyFilters = useCallback(
    () => doApply('http', setIsApplyingFilters),
    [doApply]
  );
  const applyFiltersViaRunner = useCallback(
    () => doApply('runner', setIsApplyingViaRunner),
    [doApply]
  );

  const confirmDebugReload = useCallback(() => {
    setDebugReloadPrompt((prev) => ({ ...prev, show: false }));
    if (lastTransportRef.current === 'runner') {
      applyFiltersViaRunner();
      return;
    }
    applyFilters();
  }, [applyFilters, applyFiltersViaRunner]);

  const dismissDebugReload = useCallback(
    () => setDebugReloadPrompt((prev) => ({ ...prev, show: false })),
    []
  );

  return {
    filters,
    allFilters,
    isApplyingFilters,
    isApplyingViaRunner,
    isDisabled,
    isBusy,
    hasDateFilters,
    quickDateActions,
    handleSearchableChange,
    handleDateChange,
    handleCheckboxChange,
    resetFilters,
    applyFilters,
    applyFiltersViaRunner,
    debugReloadPrompt,
    confirmDebugReload,
    dismissDebugReload,
  };
};

export { useFilterState };
