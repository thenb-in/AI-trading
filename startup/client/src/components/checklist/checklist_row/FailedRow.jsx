import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';



const FailedRow = ({ title, error }) => (
  <div className="px-5 py-3 flex items-center gap-3 text-xs">
    <AlertTriangle className="h-4 w-4 text-gray-400 shrink-0" />
    <span className="text-gray-500">{title}</span>
    <span className="ml-auto text-gray-400 italic truncate">{error}</span>
  </div>
);

FailedRow.propTypes = {
  title: PropTypes.string.isRequired,
  error: PropTypes.string.isRequired
};

export { FailedRow };
