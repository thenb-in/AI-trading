import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { shiftApi } from '@app/services/api';
import { getThisMonthFullRange, getNextMonthFullRange, getOneYearFromTodayRange } from '@utils/dateTimeUtils';
import { ScheduleRow } from './ScheduleRow';

const ScheduleTable = ({ title, schedules, onSchedulesChange, onRemoveSchedule, onSaveSchedule }) => {
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    shiftApi.getAllShifts()
      .then(res => {
        if (res?.data?.success) setShifts(res.data.data);
      })
      .catch(err => {
        toast.error('Error fetching shifts');
        console.error('Error fetching shifts:', err);
      });
  }, []);

  const handleFieldChange = (index, field, value) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'shift_id' && value) {
      const selectedShift = shifts.find(s => s.id === parseInt(value));
      if (selectedShift) updated[index].shift = selectedShift;
    }

    onSchedulesChange(updated);
  };

  const updateLastScheduleDates = (startDate, endDate) => {
    if (schedules.length === 0) {
      onSchedulesChange([{ shift_id: '', start_date: startDate, end_date: endDate }]);
      return;
    }

    const emptyIdx = schedules.findIndex(s => !s.shift_id || s.shift_id === '');
    if (emptyIdx !== -1) {
      const updated = [...schedules];
      updated[emptyIdx] = { ...updated[emptyIdx], start_date: startDate, end_date: endDate };
      onSchedulesChange(updated);
    } else {
      onSchedulesChange([...schedules, { shift_id: '', start_date: startDate, end_date: endDate }]);
    }
  };

  const addThisMonth = () => {
    const { start, end } = getThisMonthFullRange();
    updateLastScheduleDates(start, end);
  };

  const addNextMonth = () => {
    const { start, end } = getNextMonthFullRange();
    updateLastScheduleDates(start, end);
  };

  const addOneYear = () => {
    const { start, end } = getOneYearFromTodayRange();
    updateLastScheduleDates(start, end);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-md font-medium text-gray-900">{title}</h4>
      </div>

      {schedules.map((schedule, index) => (
        <ScheduleRow
          key={schedule.id ?? `new-${index}`}
          schedule={schedule}
          index={index}
          shifts={shifts}
          onFieldChange={handleFieldChange}
          onRemove={onRemoveSchedule}
          onSave={onSaveSchedule}
        />
      ))}

      {schedules.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No schedules found. Use the quick buttons below to create one.
        </div>
      )}

      <div className="flex items-end justify-end gap-2">
        <button
          type="button"
          onClick={addThisMonth}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md transition-colors hover:bg-gray-200 text-sm font-medium"
        >
          This Month
        </button>
        <button
          type="button"
          onClick={addNextMonth}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md transition-colors hover:bg-gray-200 text-sm font-medium"
        >
          Next Month
        </button>
        <button
          type="button"
          onClick={addOneYear}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md transition-colors hover:bg-gray-200 text-sm font-medium"
        >
          1 Year
        </button>
      </div>
    </div>
  );
};

ScheduleTable.propTypes = {
  title: PropTypes.string.isRequired,
  schedules: PropTypes.array.isRequired,
  onSchedulesChange: PropTypes.func.isRequired,
  onRemoveSchedule: PropTypes.func.isRequired,
  onSaveSchedule: PropTypes.func,
};

export { ScheduleTable };
