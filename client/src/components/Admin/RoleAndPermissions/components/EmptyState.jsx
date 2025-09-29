import { Shield, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getEmptyStateMessage } from '../utils/rolePermissionUtils';

const EmptyState = ({ type, onAction }) => {
  const navigate = useNavigate();
  const message = getEmptyStateMessage(type);

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (type === 'roles') {
      navigate('/admin/create-role');
    }
  };

  return (
    <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
      <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{message.title}</h3>
      <p className="text-gray-600 mb-4">{message.description}</p>
      <button
        onClick={handleAction}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        {message.action}
      </button>
    </div>
  );
};

EmptyState.propTypes = {
  type: PropTypes.oneOf(['roles', 'permissions']).isRequired,
  onAction: PropTypes.func
};

export default EmptyState;
