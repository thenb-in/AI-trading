import PropTypes from 'prop-types';

const RoleBadge = ({ role }) => {
  const roleColors = {
    user: 'bg-blue-100 text-blue-800',
    admin: 'bg-purple-100 text-purple-800',
    superadmin: 'bg-indigo-100 text-indigo-800',
    'No Role': 'bg-gray-100 text-gray-500',
  };

  const displayRole = role || 'No Role';

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[displayRole.toLowerCase()] || roleColors[displayRole] || 'bg-gray-100 text-gray-800'}`}>
      {displayRole}
    </span>
  );
};

RoleBadge.propTypes = {
  role: PropTypes.string,
};

export default RoleBadge;
