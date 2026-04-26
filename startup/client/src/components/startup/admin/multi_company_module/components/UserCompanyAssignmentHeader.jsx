import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const UserCompanyAssignmentHeader = ({ companyName, onClose, disabled }) => (
  <div className="flex items-center justify-between p-6 border-b">
    <div>
      <h2 className="text-xl font-bold text-gray-900">Assign Users for <span className="text-blue-600">{companyName || 'N/A'}</span></h2>
    </div>
    <button
      onClick={onClose}
      disabled={disabled}
      className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <X className="w-6 h-6" />
    </button>
  </div>
);

UserCompanyAssignmentHeader.propTypes = {
  companyName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export { UserCompanyAssignmentHeader };


