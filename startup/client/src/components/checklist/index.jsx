import PropTypes from 'prop-types';
import { ChecklistRow } from './checklist_row';
import { ChecklistHeader } from './ChecklistHeader';
import { useChecklistData } from './useChecklistData';


const ChecklistBoard = ({ checks, runCheck }) => {
  const { rows, selectedStatus, summary, ...headerProps } = useChecklistData(checks, runCheck);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <ChecklistHeader summary={summary} selectedStatus={selectedStatus} {...headerProps} />

      <div className="divide-y divide-gray-200">
        {rows.map(({ check, runState }) => (
          <ChecklistRow
            key={check.id}
            check={check}
            runState={runState}
            showStatusStripe={selectedStatus === 'all'}
          />
        ))}
      </div>
    </div>
  );
};

ChecklistBoard.propTypes = {
  checks: PropTypes.array.isRequired,
  runCheck: PropTypes.func.isRequired
};

export { ChecklistBoard };
