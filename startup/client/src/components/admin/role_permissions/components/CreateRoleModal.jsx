import PropTypes from 'prop-types';
import { ApiService } from '@services/ApiService';
import { CreateEntityModal } from '../../CreateEntityModal';
import { useDataContext } from '@context/useDataContext';

function CreateRoleModal({ isOpen, onClose, onSuccess }) {
  const { userData } = useDataContext();
  return (
    <CreateEntityModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      entityName="Role"
      onSubmitApi={(payload) => ApiService.createRole(payload)}
      canCreateGlobal={!!userData?.isSupportUser}
    />
  );
}

CreateRoleModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export { CreateRoleModal };
