import { Plus, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { DateTypeField } from './fields/DateTypeField';

/**
 * An editable list of rows that each apply for a stretch of time: a start date, an end date,
 * and whatever field identifies the row. Weekly off assignments, schedules and employment
 * periods are all this same shape, so the card layout, the date pair, add and remove live
 * here once, and each caller supplies only its own field through `renderFields`.
 *
 * A blank end date means no expiry — the row stays current — matching the database rule.
 *
 * `onRemoveSaved` is called only for rows that already exist on the server; it owns its own
 * API call and messages, and returning false leaves the row in place. Unsaved rows are
 * dropped without asking anyone.
 */
const PeriodRows = ({ title, itemLabel, rows = [], onRowsChange, newRow, renderFields, onRemoveSaved }) => {
  // Takes a patch rather than one field so a caller can set a value and its resolved object
  // together, in a single render.
  const setFields = (index) => (patch) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onRowsChange(next);
  };

  const dropRow = (index) => onRowsChange(rows.filter((_, i) => i !== index));

  const removeRow = async (index) => {
    if (!rows[index].id) {
      dropRow(index);
      return;
    }
    const removed = await onRemoveSaved(rows[index]);
    if (removed !== false) {
      dropRow(index);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-md font-medium text-gray-900">{title}</h4>
      </div>

      {rows.map((row, index) => (
        <div key={row.id ?? `new-${index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h5 className="text-sm font-medium text-gray-700">{itemLabel} {index + 1}</h5>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderFields(row, setFields(index))}

            <div className="w-full [&_.MuiFormControl-root]:w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <DateTypeField
                name="start_date"
                value={row.start_date ?? ''}
                onChange={(_, value) => setFields(index)({ start_date: value })}
                maxToday={false}
              />
            </div>

            <div className="w-full [&_.MuiFormControl-root]:w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <DateTypeField
                name="end_date"
                value={row.end_date ?? ''}
                onChange={(_, value) => setFields(index)({ end_date: value })}
                maxToday={false}
              />
              <p className="mt-1 text-xs text-gray-500">Leave blank for no end date</p>
            </div>
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No {itemLabel.toLowerCase()} entries yet. Use the button below to add one.
        </div>
      )}

      <div className="flex items-end justify-end">
        <button
          type="button"
          onClick={() => onRowsChange([...rows, newRow])}
          className="px-4 py-2 bg-blue-600 text-white rounded-md transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Add {itemLabel}
        </button>
      </div>
    </div>
  );
};

PeriodRows.propTypes = {
  title: PropTypes.string.isRequired,
  itemLabel: PropTypes.string.isRequired,
  rows: PropTypes.array,
  onRowsChange: PropTypes.func.isRequired,
  newRow: PropTypes.object.isRequired,
  renderFields: PropTypes.func.isRequired,
  onRemoveSaved: PropTypes.func.isRequired,
};

export { PeriodRows };
