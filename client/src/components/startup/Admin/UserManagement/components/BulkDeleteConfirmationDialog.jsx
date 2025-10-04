import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

const BulkDeleteConfirmationDialog = ({ dialog, onConfirm, onCancel }) => {
  if (!dialog.show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center mb-4">
          <AlertTriangle className="text-red-500 mr-3" size={24} />
          <h2 className="text-xl font-bold">Bulk Delete Users</h2>
        </div>
        <p className="mb-6 text-gray-700">
          Are you sure you want to permanently delete {dialog.selectedUsers.length} selected users? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Delete Users
          </button>
        </div>
      </div>
    </div>
  );
};

BulkDeleteConfirmationDialog.propTypes = {
  dialog: PropTypes.shape({
    show: PropTypes.bool.isRequired,
    selectedUsers: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default BulkDeleteConfirmationDialog;
