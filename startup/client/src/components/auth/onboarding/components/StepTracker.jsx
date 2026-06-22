import PropTypes from 'prop-types';
import { Check } from 'lucide-react';

/**
 * Vertical step tracker for the sidebar. The connector to the next step fills
 * blue once a step is complete, so progressing visibly "connects" the dots, and
 * the active dot gets a pulsing halo.
 */
function StepTracker({ steps, step }) {
  return (
    <ol className="relative mt-12">
      {steps.map((label, index) => {
        const isDone = index < step;
        const isActive = index === step;
        const isLast = index === steps.length - 1;
        return (
          <li key={label} className="relative flex items-start gap-3 pb-8 last:pb-0">
            {!isLast && (
              <span className="absolute left-4 top-8 -ml-px h-[calc(100%-2rem)] w-0.5 overflow-hidden bg-gray-700">
                <span
                  className={`block w-full bg-blue-500 transition-[height] duration-700 ease-out ${
                    isDone ? 'h-full' : 'h-0'
                  }`}
                />
              </span>
            )}

            {isActive && (
              <span className="absolute left-0 top-0 z-0 h-8 w-8 animate-ping rounded-full bg-blue-500/60" />
            )}

            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                isDone
                  ? 'bg-blue-600 text-white'
                  : isActive
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-gray-700 text-gray-400'
              }`}
            >
              {isDone ? <Check size={14} /> : index + 1}
            </span>

            <span
              className={`pt-1.5 text-sm transition-colors ${
                isActive
                  ? 'font-semibold text-white'
                  : isDone
                    ? 'text-gray-200'
                    : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

StepTracker.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.string).isRequired,
  step: PropTypes.number.isRequired
};

export { StepTracker };
