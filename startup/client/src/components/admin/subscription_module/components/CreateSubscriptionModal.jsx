import PropTypes from 'prop-types';
import { ApiService } from '@services/ApiService';
import { CreateEntityModal } from '../../CreateEntityModal';
import { useDataContext } from '@context/useDataContext';

function CreateSubscriptionModal({ isOpen, onClose, onSuccess }) {
  const { userData } = useDataContext();
  return (
    <CreateEntityModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      entityName="Subscription"
      onSubmitApi={(payload) => ApiService.createSubscription(payload)}
      canCreateGlobal={!!userData?.isSupportUser}
    />
  );
}

CreateSubscriptionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export { CreateSubscriptionModal };
