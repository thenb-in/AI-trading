import PropTypes from 'prop-types';
import { ApiService } from '@services/startup/ApiService';
import { CreateEntityModal } from '../../CreateEntityModal';

function CreateRoleModal({ isOpen, onClose, onSuccess }) {
  return (
    <CreateEntityModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      entityName="Role"
      onSubmitApi={(payload) => ApiService.createRole(payload)}
    />
  );
}

CreateRoleModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export { CreateRoleModal };
