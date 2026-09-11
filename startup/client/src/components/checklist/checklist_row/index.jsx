import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { RowSkeleton } from './RowSkeleton';
import { TaskRow } from './TaskRow';
import { ClearedRow } from './ClearedRow';
import { FailedRow } from './FailedRow';
import { DetailModal } from './DetailModal';


const ChecklistRow = ({ check, runState, showStatusStripe }) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const openDetail = useCallback(() => setDetailOpen(true), []);
  const closeDetail = useCallback(() => setDetailOpen(false), []);

  if (runState.loading) {
    return <RowSkeleton />;
  }

  if (runState.error) {
    return <FailedRow title={check.title} error={runState.error} />;
  }

  const { result } = runState;

  if ((result?.count ?? 0) === 0) {
    return (
      <ClearedRow
        title={check.title}
        clearedMessage={check.clearedMessage}
        checkedCount={result?.total ?? 0}
        windowLabel={result?.window?.label}
        showStatusStripe={showStatusStripe}
      />
    );
  }

  return (
    <>
      <TaskRow
        check={check}
        result={result}
        showStatusStripe={showStatusStripe}
        onOpenDetail={openDetail}
      />
      {detailOpen && <DetailModal check={check} result={result} isOpen onClose={closeDetail} />}
    </>
  );
};

ChecklistRow.propTypes = {
  check: PropTypes.object.isRequired,
  runState: PropTypes.object.isRequired,
  showStatusStripe: PropTypes.bool
};

export { ChecklistRow };
