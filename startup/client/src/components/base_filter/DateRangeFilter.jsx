import { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { FromToDateFields } from "@startup/components/base_components/fields/FromToDateFields";
import { QuickDateBar } from "./filter/QuickDateBar";
import { QUICK_DATE_ACTIONS } from "./filter/constants";

const DateRangeFilter = ({ startDate, endDate, onChange, disabled = false }) => {
  const [quickDateGroup, setQuickDateGroup] = useState(null);

  const handleFromChange = useCallback(
    (value) => onChange({ startDate: value, endDate: endDate && value > endDate ? value : endDate }),
    [endDate, onChange]
  );

  const handleToChange = useCallback(
    (value) => onChange({ startDate: startDate && value < startDate ? value : startDate, endDate: value }),
    [startDate, onChange]
  );

  const quickDateActions = useMemo(() => {
    const currentRange = { start_date: startDate, end_date: endDate };
    return QUICK_DATE_ACTIONS
      .filter(({ isVisible }) => !isVisible || isVisible(currentRange))
      .map(({ label, group, getRange, isVisible }) => ({
        label,
        muted: Boolean(quickDateGroup) && group !== quickDateGroup,
        animateIn: Boolean(isVisible),
        onClick: () => {
          setQuickDateGroup(group);
          const range = getRange(currentRange);
          onChange({ startDate: range.start_date, endDate: range.end_date });
        },
      }));
  }, [startDate, endDate, quickDateGroup, onChange]);

  return (

    <div className="flex w-full flex-col gap-x-6 gap-y-4 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-end">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-[20rem] lg:shrink-0">
        <FromToDateFields
          fromValue={startDate}
          toValue={endDate}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          disabled={disabled}
          maxToday
        />
      </div>
      <div className="min-w-0 flex-1 lg:pb-1">
        <QuickDateBar actions={quickDateActions} disabled={disabled} inline />
      </div>
    </div>
  );
};

DateRangeFilter.propTypes = {
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export { DateRangeFilter };
