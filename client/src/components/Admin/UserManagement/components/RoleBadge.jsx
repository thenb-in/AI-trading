import PropTypes from 'prop-types';

const RoleBadge = ({ role }) => {
  const roleColors = {
    user: 'bg-blue-100 text-blue-800',
    admin: 'bg-purple-100 text-purple-800',
    superadmin: 'bg-indigo-100 text-indigo-800',
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
      {role}
    </span>
  );
};

RoleBadge.propTypes = {
  role: PropTypes.string.isRequired,
};

export default RoleBadge;
