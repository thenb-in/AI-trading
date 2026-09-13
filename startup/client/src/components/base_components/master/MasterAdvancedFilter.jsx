import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Plus, X } from 'lucide-react';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import {
  createEmptyFilterRow,
  getFilterableColumns,
  getOperatorsForType,
  isValueLessOperator
} from '@utils/masterAdvancedFilterUtils';

const inputClassName =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500';

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' }
];

const MasterAdvancedFilter = ({
  columns = [],
  filters = [],
  onChange,
  className = ''
}) => {
  const filterableColumns = useMemo(() => getFilterableColumns(columns), [columns]);

  // A master can carry dozens of columns, which is exactly where a plain
  // <select> stops being usable — hence the searchable dropdown, typed rather
  // than scrolled.
  const fieldOptions = useMemo(
    () => filterableColumns.map((item) => ({ value: item.key, label: item.label })),
    [filterableColumns]
  );

  const handleAddFilter = () => {
    if (!onChange || filterableColumns.length === 0) return;
    onChange([...(filters || []), createEmptyFilterRow(filterableColumns)]);
  };

  const handleRemoveFilter = (id) => {
    if (!onChange) return;
    onChange((filters || []).filter((filter) => filter.id !== id));
  };

  const handleFieldChange = (id, field) => {
    if (!onChange) return;
    const column = filterableColumns.find((item) => item.key === field);
    const operators = getOperatorsForType(column?.type);

    onChange(
      (filters || []).map((filter) =>
        filter.id === id
          ? {
              ...filter,
              field,
              operator: operators[0]?.value || 'equals',
              value: ''
            }
          : filter
      )
    );
  };

  const handleOperatorChange = (id, operator) => {
    if (!onChange) return;
    onChange(
      (filters || []).map((filter) =>
        filter.id === id
          ? {
              ...filter,
              operator,
              value: isValueLessOperator(operator) ? '' : filter.value
            }
          : filter
      )
    );
  };

  const handleValueChange = (id, value) => {
    if (!onChange) return;
    onChange(
      (filters || []).map((filter) => (filter.id === id ? { ...filter, value } : filter))
    );
  };

  const handleClearAll = () => {
    onChange?.([]);
  };

  const renderValueInput = (filter) => {
    if (isValueLessOperator(filter.operator)) {
      return (
        <input
          type="text"
          disabled
          value=""
          placeholder="No value needed"
          className={`${inputClassName} bg-gray-50 text-gray-400`}
        />
      );
    }

    const column = filterableColumns.find((item) => item.key === filter.field);
    const fieldType = column?.type || 'text';

    if (fieldType === 'boolean') {
      return (
        <SearchableDropdown
          options={BOOLEAN_OPTIONS}
          selectedValues={filter.value ?? ''}
          multiple={false}
          searchable={false}
          placeholder="Select..."
          onChange={(value) => handleValueChange(filter.id, value)}
        />
      );
    }

    if (fieldType === 'date' || fieldType === 'datetime') {
      return (
        <input
          type="date"
          value={filter.value || ''}
          onChange={(e) => handleValueChange(filter.id, e.target.value)}
          className={inputClassName}
        />
      );
    }

    if (fieldType === 'number') {
      return (
        <input
          type="number"
          value={filter.value ?? ''}
          onChange={(e) => handleValueChange(filter.id, e.target.value)}
          placeholder="Enter value"
          className={inputClassName}
        />
      );
    }

    return (
      <input
        type="text"
        value={filter.value ?? ''}
        onChange={(e) => handleValueChange(filter.id, e.target.value)}
        placeholder="Enter value"
        className={inputClassName}
      />
    );
  };

  if (filterableColumns.length === 0) {
    return null;
  }

  return (
    <div className={`mb-4 rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">Filters</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddFilter}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Filter
          </button>
          {(filters || []).length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {(filters || []).length === 0 ? (
        <p className="text-sm text-gray-500">
          Add a filter to narrow results by field, operator, and value.
        </p>
      ) : (
        <div className="space-y-2">
          {(filters || []).map((filter) => {
            const column = filterableColumns.find((item) => item.key === filter.field) || filterableColumns[0];
            const operators = getOperatorsForType(column?.type);

            return (
              <div
                key={filter.id}
                className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(160px,1.2fr)_minmax(150px,1fr)_minmax(180px,1.2fr)_auto] md:items-center"
              >
                <SearchableDropdown
                  options={fieldOptions}
                  selectedValues={filter.field ?? ''}
                  multiple={false}
                  placeholder="Select field..."
                  onChange={(field) => handleFieldChange(filter.id, field)}
                />

                <SearchableDropdown
                  options={operators}
                  selectedValues={filter.operator ?? ''}
                  multiple={false}
                  searchable={false}
                  placeholder="Select operator..."
                  onChange={(operator) => handleOperatorChange(filter.id, operator)}
                />

                {renderValueInput(filter)}

                <button
                  type="button"
                  onClick={() => handleRemoveFilter(filter.id)}
                  aria-label="Remove filter"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

MasterAdvancedFilter.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      id: PropTypes.string,
      field: PropTypes.string,
      label: PropTypes.string,
      display_name: PropTypes.string,
      headerName: PropTypes.string,
      type: PropTypes.string,
      hidden: PropTypes.bool
    })
  ),
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      field: PropTypes.string,
      operator: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool])
    })
  ),
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string
};

export { MasterAdvancedFilter };
