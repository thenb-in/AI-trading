import PropTypes from 'prop-types';
import { X, Plus } from 'lucide-react';

const MasterModalActions = ({ onCancel, onConfirm, confirmLabel = 'Save', confirmIcon }) => (
  <>
    <button
      onClick={onCancel}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      <X className="w-4 h-4 inline mr-2" />
      Cancel
    </button>
    <button
      onClick={onConfirm}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
    >
      {confirmIcon ?? <Plus className="w-4 h-4 inline mr-2" />}
      {confirmLabel}
    </button>
  </>
);

MasterModalActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  confirmLabel: PropTypes.string,
  confirmIcon: PropTypes.node,
};

export { MasterModalActions };
