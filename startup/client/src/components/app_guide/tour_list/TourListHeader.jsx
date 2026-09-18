import PropTypes from 'prop-types';
import { ProgressBar } from '@startup/components/base_components/ProgressBar';

// Who the guide is for, how far through it they are, and the button that carries on.
const TourListHeader = ({ userName, doneCount, totalCount, nextTaskTitle, onContinue }) => (
  <header className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="text-sm font-medium text-blue-600">App Guide</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
        {userName ? `Welcome, ${userName}` : 'Welcome'}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Guided tours of the pages your role opens. Each one walks you through the page and its form.
      </p>
    </div>

    {totalCount > 0 && (
      <div className="flex flex-shrink-0 items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{doneCount} of {totalCount} completed</p>
          <ProgressBar
            percent={(doneCount / totalCount) * 100}
            barClass="fill-blue-600"
            trackClass="fill-gray-200"
            radius={3}
            label={`${doneCount} of ${totalCount} tours completed`}
            className="mt-1.5 h-1.5 w-40"
          />
        </div>
        {nextTaskTitle && (
          <button
            type="button"
            onClick={onContinue}
            className="max-w-[14rem] truncate rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Continue: {nextTaskTitle}
          </button>
        )}
      </div>
    )}
  </header>
);

TourListHeader.propTypes = {
  userName: PropTypes.string,
  doneCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  nextTaskTitle: PropTypes.string,
  onContinue: PropTypes.func.isRequired,
};

export { TourListHeader };
