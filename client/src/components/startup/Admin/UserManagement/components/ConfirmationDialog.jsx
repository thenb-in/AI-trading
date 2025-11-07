import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

const ConfirmationDialog = ({ dialog, onConfirm, onCancel }) => {
  if (!dialog.show) return null;

  const actions = {
    approve: {
      title: 'Approve User',
      message: `Are you sure you want to approve ${dialog.username}?`,
      buttonText: 'Approve',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    deactivate: {
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate ${dialog.username}? This will also clean up their transactions.`,
      buttonText: 'Deactivate',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
    },
    delete: {
      title: 'Delete User',
      message: `Are you sure you want to permanently delete ${dialog.username}? This action cannot be undone.`,
      buttonText: 'Delete',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
  };

  const currentAction = actions[dialog.action] || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center mb-4">
          <AlertTriangle className="text-red-500 mr-3" size={24} />
          <h2 className="text-xl font-bold">{currentAction.title}</h2>
        </div>
        <p className="mb-6 text-gray-700">{currentAction.message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-white ${currentAction.buttonClass} transition-colors`}
          >
            {currentAction.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmationDialog.propTypes = {
  dialog: PropTypes.shape({
    show: PropTypes.bool.isRequired,
    username: PropTypes.string,
    action: PropTypes.string,
  }).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ConfirmationDialog;
