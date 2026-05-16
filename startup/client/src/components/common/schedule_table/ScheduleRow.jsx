import { Trash2 } from "lucide-react";
import PropTypes from 'prop-types';
import { DateTypeField } from '@startup/components/base_components/fields/DateTypeField';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { singleSelectValues } from '@startup/components/base_components/fields/utils/singleSelectValues';

const ScheduleRow = ({ schedule, index, shifts, onFieldChange, onRemove, onSave }) => {
  const shiftOptions = shifts.map((shift) => ({ value: shift.id, label: shift.alias }));

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h5 className="text-sm font-medium text-gray-700">Schedule {index + 1}</h5>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="w-full [&_.MuiFormControl-root]:w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <DateTypeField
            name="start_date"
            value={schedule.start_date ?? ''}
            onChange={(_, value) => onFieldChange(index, 'start_date', value)}
            maxToday={false}
          />
        </div>

        <div className="w-full [&_.MuiFormControl-root]:w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <DateTypeField
            name="end_date"
            value={schedule.end_date ?? ''}
            onChange={(_, value) => onFieldChange(index, 'end_date', value)}
            maxToday={false}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
          <SearchableDropdown
            options={shiftOptions}
            selectedValues={singleSelectValues(schedule.shift_id)}
            onChange={(vals) => onFieldChange(index, 'shift_id', vals[0] ?? '')}
            placeholder="Select Shift"
            multiple={false}
          />
        </div>
      </div>

      {onSave && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onSave(index)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {schedule.id ? 'Update' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
};

ScheduleRow.propTypes = {
  schedule: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  shifts: PropTypes.array.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onSave: PropTypes.func,
};

export { ScheduleRow };
