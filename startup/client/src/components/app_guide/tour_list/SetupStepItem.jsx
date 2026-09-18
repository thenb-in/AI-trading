import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Check, PlayCircle } from 'lucide-react';
import { useGuideTour } from '../useGuideTour';
import { TourLockNote } from './TourLockNote';

// How a step looks and reads, by the one state it is in.
const stepLook = (isDone, isNext, isLocked) => {
  if (isLocked) return { circle: 'border-gray-200 bg-gray-50 text-gray-400', text: 'Locked', textClass: 'text-gray-400' };
  if (isDone) return { circle: 'border-blue-600 bg-blue-600 text-white', text: 'Completed', textClass: 'text-emerald-600' };
  if (isNext) return { circle: 'border-blue-600 bg-white text-blue-600', text: 'Up next', textClass: 'text-blue-600' };
  return { circle: 'border-gray-300 bg-white text-gray-500', text: 'Not started', textClass: 'text-gray-500' };
};

// One setup task in the stepper across the top of the guide.
const SetupStepItem = ({ task, position, isNext, isLast }) => {
  const { startTour, done } = useGuideTour();
  const openTour = useCallback(() => startTour(task), [startTour, task]);
  const isDone = done.has(task.id);
  const isLocked = Boolean(task.lockedReason);
  const look = stepLook(isDone, isNext, isLocked);

  return (
    <li className="relative md:flex md:flex-1">
      <div className="flex w-full flex-col px-5 py-4 md:pr-9">
        <div className="flex items-center">
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${look.circle}`}>
            {isDone ? <Check className="h-5 w-5" /> : String(position).padStart(2, '0')}
          </span>
          <span className="ml-3 flex min-w-0 flex-col">
            <span className={`text-sm font-semibold leading-snug ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>{task.title}</span>
            <span className={`text-xs font-medium ${look.textClass}`}>{look.text}</span>
          </span>
        </div>

        {task.summary && <p className="mt-3 line-clamp-2 text-sm text-gray-500">{task.summary}</p>}

        {isLocked ? (
          <TourLockNote reason={task.lockedReason} className="mt-4 max-w-full self-start" />
        ) : (
          <button
            type="button"
            onClick={openTour}
            className={`mt-4 inline-flex items-center gap-1.5 self-start rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              isNext
                ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <PlayCircle className="h-4 w-4" />
            {isDone ? 'Replay tour' : 'Start tour'}
          </button>
        )}
      </div>

      {!isLast && (
        <div aria-hidden="true" className="absolute right-0 top-0 hidden h-full w-5 md:block">
          <svg fill="none" viewBox="0 0 22 80" preserveAspectRatio="none" className="h-full w-full text-gray-300">
            <path d="M0 -2L20 40L0 82" stroke="currentcolor" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </li>
  );
};

SetupStepItem.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string,
    lockedReason: PropTypes.string,
  }).isRequired,
  position: PropTypes.number.isRequired,
  isNext: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired,
};

export { SetupStepItem };
