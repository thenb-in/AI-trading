import PropTypes from 'prop-types';
import { Lock } from 'lucide-react';

// Stands in for the start button on a page that cannot be opened, saying what is missing.
const TourLockNote = ({ reason, className = '' }) => (
  <span
    title={reason}
    className={`inline-flex items-start gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-left text-xs font-medium text-gray-500 ${className}`}
  >
    <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
    <span>{reason}</span>
  </span>
);

TourLockNote.propTypes = {
  reason: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export { TourLockNote };
