import PropTypes from 'prop-types';
import { ApiService } from '@services/ApiService';
import { CreateRecordModal } from '../../CreateRecordModal';
import { useDataContext } from '@context/useDataContext';

function CreateRoleModal({ isOpen, onClose, onSuccess, initialName = '' }) {
  const { userData } = useDataContext();
  return (
    <CreateRecordModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      recordType="Role"
      initialName={initialName}
      onSubmitApi={(payload) => ApiService.createRole(payload)}
      canCreateGlobal={!!userData?.isSupportUser}
    />
  );
}

CreateRoleModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  /** Pre-fills the role name — e.g. what was typed into the role dropdown. */
  initialName: PropTypes.string,
};

export { CreateRoleModal };
