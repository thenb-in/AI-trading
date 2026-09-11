import { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toggleDebugMode } from '@services/debugModeService';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { useShortcut } from '@startup/hooks/useShortcut';
import { useFilterState } from './useFilterState';
import { useFilterOptionResolver } from './useFilterOptionResolver';
import { FilterHeader } from './FilterHeader';
import { FilterActions } from './FilterActions';
import { QuickDateBar } from './QuickDateBar';
import { BusyOverlay } from './BusyOverlay';
import { DebugReloadDialog } from './DebugReloadDialog';
import { FilterCell } from './FilterCell';
import { sortByOrder } from './helpers';
import { FILTER_GRID_CLASS } from './constants';

const Filter = ({
  filtersConfig = [],
  onFiltersApply,
  onFilterChange,
  disabled = false,
  isLoading = false,
  hideToggle = false,
  showApplyButton = false,
  enableRunner = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const filterContainerRef = useRef(null);

  const {
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
    handleNumberChange,
    resetFilters,
    applyFilters,
    applyFiltersViaRunner,
    debugReloadPrompt,
    confirmDebugReload,
    dismissDebugReload,
  } = useFilterState({ filtersConfig, onFilterChange, onFiltersApply, isLoading });

  // Alt+Enter applies from anywhere on the page — the panel's own fields, a
  // dropdown that portals its popup outside the panel, or the grid below it.
  // When the runner is offered it is the primary way to run the report, so the
  // shortcut follows it rather than the in-app apply.
  useShortcut(
    SHORTCUTS.APPLY_FILTERS,
    enableRunner ? applyFiltersViaRunner : applyFilters,
    { enabled: !disabled && !isDisabled },
  );

  const handleFiltersLabelClick = useCallback((e) => {
    if (e.detail === 3) toggleDebugMode();
  }, []);

  const toggleExpanded = useCallback(() => setIsExpanded((v) => !v), []);

  const { standardFilters, nonStandardFilters, checkboxFilters } = useMemo(() => {
    const standard = [];
    const nonStandard = [];
    const checkbox = [];
    allFilters.forEach((c) => {
      if (c.hidden) return;
      if (c.type === 'checkbox') {
        checkbox.push(c);
        return;
      }
      (c.is_standard ? standard : nonStandard).push(c);
    });
    standard.sort(sortByOrder);
    nonStandard.sort(sortByOrder);
    checkbox.sort(sortByOrder);
    return { standardFilters: standard, nonStandardFilters: nonStandard, checkboxFilters: checkbox };
  }, [allFilters]);

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter((value) => {
      if (typeof value === 'boolean') return value;
      if (Array.isArray(value)) return value.length > 0;
      return value !== 'all' && value !== '';
    }).length,
    [filters]
  );

  const fieldHandlers = {
    onSearchableChange: handleSearchableChange,
    onDateChange: handleDateChange,
    onCheckboxChange: handleCheckboxChange,
    onNumberChange: handleNumberChange,
  };


  const resolveConfig = useFilterOptionResolver(filters);

  const renderCell = (config, withLabel) => (
    <FilterCell
      key={config.name}
      config={resolveConfig(config)}
      value={filters[config.name]}
      isDisabled={isDisabled}
      withLabel={withLabel}
      handlers={fieldHandlers}
    />
  );

  return (
    <div
      ref={filterContainerRef}
      className={`relative bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-300 rounded-lg shadow-lg mb-4 ${
        disabled ? 'opacity-70' : ''
      }`}
    >
      {isBusy && <BusyOverlay isApplyingFilters={isApplyingFilters} />}

      <DebugReloadDialog
        show={debugReloadPrompt.show}
        debugEnabled={debugReloadPrompt.debugEnabled}
        onConfirm={confirmDebugReload}
        onCancel={dismissDebugReload}
      />

      <FilterHeader
        activeFiltersCount={activeFiltersCount}
        isBusy={isBusy}
        isLoading={isLoading}
        isExpanded={isExpanded}
        onLabelClick={handleFiltersLabelClick}
        onToggleExpanded={toggleExpanded}
        hideToggle={hideToggle}
      />

      <div
        className={`transition-all duration-300 ${
          isExpanded ? 'opacity-100 max-h-none' : 'opacity-0 max-h-0 overflow-hidden'
        }`}
      >
        <div className="p-3 sm:p-4 space-y-3 bg-white rounded-b-lg">
          {standardFilters.length > 0 && (
            <div>
              <div className={FILTER_GRID_CLASS}>
                {standardFilters.map((c) => renderCell(c, true))}
              </div>
              {hasDateFilters && (
                <QuickDateBar actions={quickDateActions} disabled={isDisabled} />
              )}
            </div>
          )}

          {nonStandardFilters.length > 0 && (
            <div className="space-y-2">
              <div className={FILTER_GRID_CLASS}>
                {nonStandardFilters.map((c) => renderCell(c, true))}
              </div>
            </div>
          )}

          {checkboxFilters.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {checkboxFilters.map((c) => renderCell(c, false))}
            </div>
          )}

          <FilterActions
            disabled={disabled || isDisabled}
            onReset={resetFilters}
            onApply={applyFilters}
            onApplyViaRunner={enableRunner ? applyFiltersViaRunner : undefined}
            isApplyingFilters={isApplyingFilters}
            isApplyingViaRunner={isApplyingViaRunner}
            showApplyButton={showApplyButton}
          />
        </div>
      </div>
    </div>
  );
};

Filter.propTypes = {
  filtersConfig: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string,
      type: PropTypes.oneOf(['date', 'select', 'checkbox', 'number']).isRequired,
      default: PropTypes.any,
      options: PropTypes.array,
      multiselect: PropTypes.bool,
      searchable: PropTypes.bool,
      optionsLoading: PropTypes.bool,
      onOpenOptions: PropTypes.func,
      placeholder: PropTypes.string,
      is_standard: PropTypes.bool,
      order: PropTypes.number,
      hidden: PropTypes.bool,
      alwaysInclude: PropTypes.bool,
      debug: PropTypes.bool,
    })
  ),
  onFiltersApply: PropTypes.func,
  onFilterChange: PropTypes.func,
  disabled: PropTypes.bool,
  isLoading: PropTypes.bool,
  hideToggle: PropTypes.bool,
  showApplyButton: PropTypes.bool,
  enableRunner: PropTypes.bool,
};

export { Filter };
