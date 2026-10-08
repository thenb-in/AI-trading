import { Plus } from 'lucide-react';
import PropTypes from 'prop-types';


const BaseEmptyState = ({ icon: Icon, title, message, actionLabel, onAction }) => (
  <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
      <Icon className="h-6 w-6" />
    </span>
    <p className="mt-3 text-sm font-medium text-gray-900">{title}</p>
    {message && <p className="mt-1 text-xs text-gray-500">{message}</p>}
    {onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {actionLabel}
      </button>
    )}
  </div>
);

BaseEmptyState.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
};

export { BaseEmptyState };
