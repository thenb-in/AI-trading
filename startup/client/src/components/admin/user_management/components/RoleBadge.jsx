import PropTypes from 'prop-types';

// Role names are whatever a company made them — `attendance_admin`,
// `company_user`, anything. Hard-coding colours for three known names left
// every custom role the same grey as "No Role", so a user with a role and a
// user without one looked identical. Deriving the colour from the name instead
// gives each role its own, stable across renders and across companies.
const ROLE_STYLES = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-indigo-100 text-indigo-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-cyan-100 text-cyan-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
];

const NO_ROLE_STYLE = 'bg-gray-100 text-gray-500 italic border border-dashed border-gray-300';

const styleFor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 4096;
  }
  return ROLE_STYLES[hash % ROLE_STYLES.length];
};

const RoleBadge = ({ role, description }) => {
  const hasRole = Boolean(role) && role !== 'No Role';
  const displayRole = hasRole ? role : 'No Role';

  return (
    <span
      title={hasRole ? (description || displayRole) : 'This user has no role, so they can do nothing yet'}
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        hasRole ? styleFor(displayRole) : NO_ROLE_STYLE
      }`}
    >
      {displayRole}
    </span>
  );
};

RoleBadge.propTypes = {
  role: PropTypes.string,
  description: PropTypes.string,
};

export { RoleBadge };
