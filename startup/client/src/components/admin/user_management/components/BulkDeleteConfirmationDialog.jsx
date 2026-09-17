import PropTypes from 'prop-types';
import { ConfirmModal } from '@startup/components/base_components/master';

const BulkDeleteConfirmationDialog = ({ dialog, onConfirm, onCancel }) => (
  <ConfirmModal
    isOpen={dialog.show}
    onClose={onCancel}
    onConfirm={onConfirm}
    title="Bulk Delete Users"
    message={`Are you sure you want to permanently delete ${dialog.selectedUsers.length} selected users? This action cannot be undone.`}
    confirmText="Delete Users"
    tone="danger"
  />
);

BulkDeleteConfirmationDialog.propTypes = {
  dialog: PropTypes.shape({
    show: PropTypes.bool.isRequired,
    selectedUsers: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export { BulkDeleteConfirmationDialog };
