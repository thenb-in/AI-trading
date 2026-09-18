import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { PlayCircle } from 'lucide-react';
import { useGuideTour } from '../useGuideTour';
import { TourLockNote } from './TourLockNote';

// One page in the guide's list: what it is, and its tour.
const TourTaskRow = ({ task }) => {
  const { startTour, done } = useGuideTour();
  const openTour = useCallback(() => startTour(task), [startTour, task]);
  const Icon = task.icon;
  const isDone = done.has(task.id);
  const isLocked = Boolean(task.lockedReason);

  return (
    <li className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-4">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg [&>svg]:h-5 [&>svg]:w-5 ${
        isLocked ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'
      }`}>
        {Icon && <Icon />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`text-sm font-semibold ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>{task.title}</h3>
          {isDone && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              Completed
            </span>
          )}
        </div>
        {task.summary && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{task.summary}</p>}
      </div>

      {isLocked ? (
        <TourLockNote reason={task.lockedReason} className="max-w-full flex-shrink-0 self-start sm:self-center" />
      ) : (
        <button
          type="button"
          onClick={openTour}
          className="inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:self-center"
        >
          <PlayCircle className="h-4 w-4" />
          {isDone ? 'Replay tour' : 'Start tour'}
        </button>
      )}
    </li>
  );
};

TourTaskRow.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string,
    icon: PropTypes.elementType,
    lockedReason: PropTypes.string,
  }).isRequired,
};

export { TourTaskRow };
