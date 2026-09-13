import PropTypes from 'prop-types';
import { ApiService } from '@services/ApiService';
import { registerFrameworkMasterCreators } from '@/data/masterCreatorRegistry';
import { CreateRecordModal } from './CreateRecordModal';
import { useDataContext } from '@context/useDataContext';

/**
 * Create a role, from anywhere a role can be picked.
 *
 * Lives here rather than under role_permissions/ because it is no longer that
 * screen's private dialog — the notification rule audience picker opens the
 * same one. A master reaching into an admin screen for it would be the wrong
 * direction of dependency.
 */
const MASTER_TYPE_ROLE = 'role';

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

// Framework-owned creator: any selector or screen opens it with
// openMasterModal({ type: MASTER_TYPE_ROLE }), the same call an app master
// uses. `defaults.initialName` is what the dropdown's create row had typed.
function RoleCreator({ isOpen, defaults, onClose, onSuccess }) {
  return (
    <CreateRoleModal
      isOpen={isOpen}
      initialName={defaults?.initialName || ''}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

RoleCreator.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  defaults: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

registerFrameworkMasterCreators({ [MASTER_TYPE_ROLE]: RoleCreator });

export { CreateRoleModal, MASTER_TYPE_ROLE };
