import PropTypes from 'prop-types';
import { ApiService } from '@services/ApiService';
import { CreateEntityModal } from '../../CreateEntityModal';

function CreateSubscriptionModal({ isOpen, onClose, onSuccess }) {
  return (
    <CreateEntityModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      entityName="Subscription"
      onSubmitApi={(payload) => ApiService.createSubscription(payload)}
    />
  );
}

CreateSubscriptionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export { CreateSubscriptionModal };
