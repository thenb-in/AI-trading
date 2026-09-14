/**
 * Column Menu component for showing/hiding and freezing columns
 */

import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import PropTypes from "prop-types";

function ColumnMenu({
  normalizedColumns,
  columnVisibility,
  frozenState,
  toggleColumnVisibility,
  toggleFrozen,
  onClose,
}) {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[250px] max-h-[400px] overflow-y-auto">
      <div className="mb-2 font-semibold text-[13px]">
        Show/Hide Columns
      </div>
      {normalizedColumns.map((c) => (
        <label
          key={c.field}
          className="flex items-center gap-2 mb-1.5"
        >
          <CheckboxTypeField
            mode="bare"
            checked={!!columnVisibility[c.field]}
            onChange={() => toggleColumnVisibility(c.field)}
          />
          <span className="text-[13px]">{c.headerName}</span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleFrozen(c.field)}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
              title={frozenState[c.field] ? "Unfreeze column" : "Freeze column"}
            >
              {frozenState[c.field] ? "Unfreeze" : "Freeze"}
            </button>
          </span>
        </label>
      ))}
      <div className="mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1.5 rounded-md border border-gray-300 bg-white cursor-pointer hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}

ColumnMenu.propTypes = {
  normalizedColumns: PropTypes.array.isRequired,
  columnVisibility: PropTypes.object.isRequired,
  frozenState: PropTypes.object.isRequired,
  toggleColumnVisibility: PropTypes.func.isRequired,
  toggleFrozen: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export { ColumnMenu };

